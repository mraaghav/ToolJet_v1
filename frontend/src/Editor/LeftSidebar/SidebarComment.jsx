import React from 'react';
import cx from 'classnames';
import { LeftSidebarItem } from './SidebarItem';
import { commentsService } from '@/_services';
import useRouter from '@/_hooks/use-router';
import { useEditingVersionId } from '@/_stores/appVersionsManagerStore';

export const LeftSidebarComment = ({ toggleComments, selectedSidebarItem, currentPageId }) => {
  const darkMode = localStorage.getItem('darkMode') === 'true';
  const appVersionsId = useEditingVersionId();

  const [isActive, toggleActive] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
  const router = useRouter();

  React.useEffect(() => {
    if (appVersionsId) {
      commentsService.getNotifications(router.query.id, false, appVersionsId, currentPageId).then(({ data }) => {
        setNotifications(data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appVersionsId, currentPageId]);

  return (
    <LeftSidebarItem
      commentBadge={notifications?.length > 0}
      selectedSidebarItem={selectedSidebarItem}
      title={appVersionsId ? 'toggle comments' : 'Comments section will be available once you save this application'}
      icon={darkMode ? `comments-dark` : 'comments-light'}
      className={cx(`left-sidebar-item left-sidebar-layout sidebar-comments`, {
        disabled: !appVersionsId,
        active: isActive,
        dark: darkMode,
      })}
      onClick={() => {
        toggleActive(!isActive);
        toggleComments();
      }}
      tip="Comments"
    />
  );
};
