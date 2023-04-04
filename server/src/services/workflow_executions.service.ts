import { CreateWorkflowExecutionDto } from '@dto/create-workflow-execution.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AppVersion } from 'src/entities/app_version.entity';
import { WorkflowExecution } from 'src/entities/workflow_execution.entity';
import { WorkflowExecutionNode } from 'src/entities/workflow_execution_node.entity';
import { WorkflowExecutionEdge } from 'src/entities/workflow_execution_edge.entity';
import { dbTransactionWrap } from 'src/helpers/utils.helper';
import { EntityManager, Repository } from 'typeorm';
import { find } from 'lodash';
import { DataQueriesService } from './data_queries.service';
import { User } from 'src/entities/user.entity';
import { getQueryVariables } from 'lib/utils';

@Injectable()
export class WorkflowExecutionsService {
  constructor(
    @InjectRepository(AppVersion)
    private appVersionsRepository: Repository<AppVersion>,

    @InjectRepository(WorkflowExecution)
    private workflowExecutionRepository: Repository<WorkflowExecution>,

    @InjectRepository(WorkflowExecutionEdge)
    private workflowExecutionEdgeRepository: Repository<WorkflowExecutionEdge>,

    @InjectRepository(WorkflowExecutionNode)
    private workflowExecutionNodeRepository: Repository<WorkflowExecutionNode>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    private dataQueriesService: DataQueriesService
  ) {}

  async create(createWorkflowExecutionDto: CreateWorkflowExecutionDto): Promise<WorkflowExecution> {
    const workflowExecution = await dbTransactionWrap(async (manager: EntityManager) => {
      const workflowExecution = await manager.save(
        WorkflowExecution,
        manager.create(WorkflowExecution, {
          appVersionId: createWorkflowExecutionDto.appVersionId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      const appVersion = await this.appVersionsRepository.findOne({ where: { id: workflowExecution.appVersionId } });
      const definition = appVersion.definition;

      const nodes = [];
      for (const nodeData of definition.nodes) {
        const node = await manager.save(
          WorkflowExecutionNode,
          manager.create(WorkflowExecutionNode, {
            type: nodeData.type,
            workflowExecutionId: workflowExecution.id,
            idOnWorkflowDefinition: nodeData.id,
            definition: nodeData.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );

        nodes.push(node);
      }

      const startNode = find(nodes, (node) => node.definition.nodeType === 'start');
      workflowExecution.startNodeId = startNode.id;

      await manager.update(WorkflowExecution, workflowExecution.id, { startNode });

      const edges = [];
      for (const edgeData of definition.edges) {
        // const sourceNode = find(nodes, (node) => node.idOnWorkflowDefinition === edgeData.source);
        // const targetNode = find(nodes, (node) => node.idOnWorkflowDefinition === edgeData.target);

        console.log({ nodes, edges: definition.edges });
        const edge = await manager.save(
          WorkflowExecutionEdge,
          manager.create(WorkflowExecutionEdge, {
            workflowExecutionId: workflowExecution.id,
            idOnWorkflowDefinition: edgeData.id,
            sourceWorkflowExecutionNodeId: find(nodes, (node) => node.idOnWorkflowDefinition === edgeData.source).id,
            targetWorkflowExecutionNodeId: find(nodes, (node) => node.idOnWorkflowDefinition === edgeData.target).id,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );

        edges.push(edge);
      }

      return workflowExecution;
    });

    return workflowExecution;
  }

  async getStatus(workflowExecutionId: string) {
    const workflowExecution = await this.workflowExecutionRepository.findOne(workflowExecutionId);
    const workflowExecutionNodes = await this.workflowExecutionNodeRepository.find({
      where: {
        workflowExecutionId: workflowExecution.id,
      },
    });

    return workflowExecutionNodes.map((node) => ({
      id: node.id,
      idOnDefinition: node.idOnWorkflowDefinition,
      executed: node.executed,
      result: node.result,
    }));
  }

  async execute(workflowExecution: WorkflowExecution): Promise<boolean> {
    const appVersion = await this.appVersionsRepository.findOne(workflowExecution.appVersionId);

    workflowExecution = await this.workflowExecutionRepository.findOne({
      where: {
        id: workflowExecution.id,
      },
      relations: ['startNode', 'user'],
    });

    const queue = [];

    queue.push(workflowExecution.startNode);

    while (queue.length !== 0) {
      const nodeToBeExecuted = queue.shift();

      const currentNode = await this.workflowExecutionNodeRepository.findOne({ where: { id: nodeToBeExecuted.id } });

      const { state, previousNodesExecutionCompletionStatus } =
        await this.getStateAndPreviousNodesExecutionCompletionStatus(currentNode);

      if (!previousNodesExecutionCompletionStatus) {
        queue.push(currentNode);
      } else {
        switch (currentNode.type) {
          case 'input': {
            void this.completeNodeExecution(currentNode, '', {});
            void queue.push(...(await this.forwardNodes(currentNode)));
            break;
          }

          case 'query': {
            const queryId = find(appVersion.definition.queries, {
              idOnDefinition: currentNode.definition.idOnDefinition,
            }).id;

            const query = await this.dataQueriesService.findOne(queryId);
            const user = await this.userRepository.findOne(workflowExecution.executingUserId, {
              relations: ['organization'],
            });
            user.organizationId = user.organization.id;
            try {
              void getQueryVariables(query.options, state);
            } catch (e) {
              console.log({ e });
            }

            const options = getQueryVariables(query.options, state);
            try {
              const result = await this.dataQueriesService.runQuery(user, query, options);

              const newState = {
                ...state,
                [query.name]: result,
              };

              void this.completeNodeExecution(currentNode, JSON.stringify(result), newState);
              void queue.push(...(await this.forwardNodes(currentNode)));
            } catch (exception) {
              const result = { status: 'failed', exception };

              const newState = {
                ...state,
                [query.name]: result,
              };

              void this.completeNodeExecution(currentNode, JSON.stringify(result), newState);
              queue.push(...(await this.forwardNodes(currentNode)));
              console.log({ exception });
            }

            break;
          }
        }
      }
    }
    return true;
  }

  async completeNodeExecution(node: WorkflowExecutionNode, result: any, state: object) {
    await dbTransactionWrap(async (manager: EntityManager) => {
      await manager.update(WorkflowExecutionNode, node.id, { executed: true, result, state });
    });
  }

  async getStateAndPreviousNodesExecutionCompletionStatus(node: WorkflowExecutionNode) {
    const incomingEdges = await this.workflowExecutionEdgeRepository.find({
      where: {
        targetWorkflowExecutionNodeId: node.id,
      },
      relations: ['sourceWorkflowExecutionNode'],
    });

    const incomingNodes = await Promise.all(incomingEdges.map((edge) => edge.sourceWorkflowExecutionNode));

    const previousNodesExecutionCompletionStatus = !incomingNodes.map((node) => node.executed).includes(false);

    const state = incomingNodes.reduce((existingState, node) => {
      const nodeState = node.state ?? {};
      return { ...existingState, ...nodeState };
    }, {});

    return { state, previousNodesExecutionCompletionStatus };
  }

  async forwardNodes(startNode: WorkflowExecutionNode): Promise<WorkflowExecutionNode[]> {
    const forwardEdges = await this.workflowExecutionEdgeRepository.find({
      where: {
        sourceWorkflowExecutionNode: startNode,
      },
    });

    const forwardNodeIds = forwardEdges.map((edge) => edge.targetWorkflowExecutionNodeId);

    const forwardNodes = Promise.all(
      forwardNodeIds.map((id) =>
        this.workflowExecutionNodeRepository.findOne({
          where: {
            id,
          },
        })
      )
    );

    return forwardNodes;
  }
}
