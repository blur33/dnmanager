import React from "react";
// import StepWizard from "react-step-wizard";
// reactstrap components
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  Row,
  Col,
} from "reactstrap";
import Step1 from "./Step1";

const DomainManager = (props) => {
  return (
    <div className="content">
      <Card className="card-stats">
        <CardBody>
          <Step1 />
        </CardBody>
      </Card>
    </div>
  );
};

export default DomainManager;
