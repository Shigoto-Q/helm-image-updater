import * as core from "@actions/core";
import { Inputs } from "./constants";
import { Octokit } from "@octokit/rest";
import { updateImage } from "./updater";

export async function run(): Promise<void> {
  try {
    const octo = new Octokit({
      auth: core.getInput(Inputs.AccessToken),
    });

    const owner = core.getInput(Inputs.Owner);
    const repo = core.getInput(Inputs.Repository);
    const valuesPath = core.getInput(Inputs.ValuesPath);
    const currentTag = core.getInput(Inputs.CurrentTag);
    const newTag = core.getInput(Inputs.NewTag);

    const repos = await octo.repos.listForOrg({
      org: owner,
    });

    if (!repos.data.map((repo) => repo.name).includes(repo)) {
      throw new Error("Specified repository does not exist.");
    }

    await updateImage(octo, valuesPath, owner, repo, currentTag, newTag);
  } catch (err) {
    core.setFailed(err);
  }
}
