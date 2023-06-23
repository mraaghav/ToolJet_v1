import React from 'react';

const ZoomIn = ({ fill = '#C1C8CD', width = '25', className = '', viewBox = '0 0 25 25' }) => (
  <svg
    width={width}
    height={width}
    viewBox={viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      opacity="0.4"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.9697 17.9697C18.2626 17.6768 18.7374 17.6768 19.0303 17.9697L21.5303 20.4697C21.8232 20.7626 21.8232 21.2374 21.5303 21.5303C21.2374 21.8232 20.7626 21.8232 20.4697 21.5303L17.9697 19.0303C17.6768 18.7374 17.6768 18.2626 17.9697 17.9697Z"
      fill={fill}
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15 21C18.3137 21 21 18.3137 21 15C21 11.6863 18.3137 9 15 9C11.6863 9 9 11.6863 9 15C9 18.3137 11.6863 21 15 21ZM15 12.25C15.3322 12.25 15.6016 12.5858 15.6016 13V14.3987H17C17.4142 14.3987 17.75 14.6679 17.75 15C17.75 15.3321 17.4142 15.6013 17 15.6013H15.6016V17C15.6016 17.4142 15.3322 17.75 15 17.75C14.6678 17.75 14.3984 17.4142 14.3984 17V15.6013H13C12.5858 15.6013 12.25 15.3321 12.25 15C12.25 14.6679 12.5858 14.3987 13 14.3987H14.3984V13C14.3984 12.5858 14.6678 12.25 15 12.25Z"
      fill={fill}
    />
    <path
      opacity="0.4"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.25 7C2.25 4.37665 4.37665 2.25 7 2.25H17C19.6234 2.25 21.75 4.37665 21.75 7V8.625C21.75 9.03921 21.4142 9.375 21 9.375C20.5858 9.375 20.25 9.03921 20.25 8.625V7C20.25 5.20507 18.7949 3.75 17 3.75H7C5.20507 3.75 3.75 5.20507 3.75 7V17C3.75 18.7949 5.20507 20.25 7 20.25H8.625C9.03921 20.25 9.375 20.5858 9.375 21C9.375 21.4142 9.03921 21.75 8.625 21.75H7C4.37665 21.75 2.25 19.6234 2.25 17V7Z"
      fill={fill}
    />
  </svg>
);

export default ZoomIn;
