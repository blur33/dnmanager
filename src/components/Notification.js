import React, { useEffect, useState } from "react";
import { Alert, UncontrolledAlert } from "reactstrap";

const Notification = ({ title }) => {
  const [className, setClassName] = useState("alert-with-icon");

  //   useEffect(() => {
  //     setTimeout(() => {
  //       setClassName(className + " d-none");
  //     }, 5000);
  //   }, []);

  return (
    <>
      <UncontrolledAlert className={className} color="danger" fade={false}>
        <span data-notify="icon" className="nc-icon nc-bell-55" />
        <span data-notify="message">{title}</span>
      </UncontrolledAlert>
    </>
  );
};

export default Notification;
