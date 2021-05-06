import DomainManager from "./views/DomainManager";

var routes = [
  {
    path: "/domains",
    name: "Manage My Domains",
    icon: "nc-icon nc-spaceship",
    component: DomainManager,
    layout: "/admin",
  },
];
export default routes;
