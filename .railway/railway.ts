import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const web = service("web", {
    source: github("nitish-sah-js/EasyGo"),
    build: "npm run build",
    start: "concurrently -n api,worker,web -c cyan,magenta,green \"npm run start -w @nexttour/api\" \"npm run start -w @nexttour/worker\" \"npm run start -w @nexttour/web\"",
  });

  return project("Easy", {
    resources: [web],
  });
});
