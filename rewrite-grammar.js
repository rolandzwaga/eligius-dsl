import * as fs from "node:fs";

const configStr = fs.readFileSync("./langium-config.json", {
  encoding: "utf-8",
});
const config = JSON.parse(configStr);

const textMatePath = config.languages.find((x) => x.id === "eligius")?.textMate
  .out;

if (!textMatePath) {
  throw new Error("Config property not found: languages[...].textMate.out");
}

const textMateStr = fs.readFileSync(`./${textMatePath}`, {
  encoding: "utf-8",
});
const textMateConfig = JSON.parse(textMateStr);

const patterns = textMateConfig.repository.comments.patterns;
let index = patterns.findIndex((x) => x.begin === ":");
if (index > -1) {
  patterns.splice(index, 1);
}

index = patterns.findIndex((x) => x.begin === "=");
if (index > -1) {
  patterns.splice(index, 1);
}

fs.writeFileSync(
  `./${textMatePath}`,
  JSON.stringify(textMateConfig, null, "\t"),
  { encoding: "utf-8" }
);
