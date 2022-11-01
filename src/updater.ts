import { Octokit } from "@octokit/rest";
import { readFileSync, writeFileSync } from "fs";
import { Base64 } from "js-base64";
import { File } from "./interfaces";
import { load, dump } from "js-yaml";
import { _ } from "lodash";


export async function updateImage(
  octokit: Octokit,
  filepath: string,
  owner: string,
  repo: string,
  imageKey: string,
  newTag: string
) {
  const currentContent = await getFileContents(octokit, filepath, owner, repo);
  const replaced = getUpdatedFile(currentContent, imageKey, newTag);
  commitChange(octokit, filepath, owner, repo, replaced);
}

async function getFileContents(
  octokit: Octokit,
  filepath: string,
  owner: string,
  repo: string
): Promise<string> {
  try {
    const content = await octokit.repos.getContent({
      owner: owner,
      path: filepath,
      repo: repo,
    });
  
    const base64Decoded = Base64.decode(content.data["content"]);
  
    return base64Decoded;
  } catch (err) {
    throw new Error("Error while fetching values file! Check if the path provided is correct.")
  }

}

function getUpdatedFile(
  contents: string,
  imageKey: string,
  newTag: string
): string {
  const splitImageKey = imageKey.split('.');
  const imageKeyOnly = splitImageKey[splitImageKey.length-1]
  if (contents.indexOf(imageKeyOnly) < 0) {
    throw new Error("Provided image key not found in file content!");
  }
  const valuesFile = load(contents)
  _.set(valuesFile, imageKey, newTag);
  return dump(valuesFile)
}


async function commitChange(
  octokit: Octokit,
  filepath: string,
  owner: string,
  repo: string,
  newContent: string
): Promise<void> {
  const base64Encoded = Base64.encode(newContent);

  const commits = await octokit.repos.listCommits({
    owner: owner,
    repo: repo,
  });

  const commitSHA = commits.data[0].sha;
  const file = {
    name: filepath,
    contents: newContent,
  };

  const commitableFile: File[] = [
    {
      path: file.name,
      mode: "100644",
      type: "commit",
      content: file.contents,
    },
  ];

  const tree = await octokit.git.createTree({
    owner: owner,
    repo: repo,
    tree: commitableFile,
    base_tree: commitSHA,
    message: "Updating image tag",
    parents: [commitSHA],
  });
  const currentSHA = tree.data.sha;

  const commit = await octokit.git.createCommit({
    owner: owner,
    repo: repo,
    tree: currentSHA,
    message: `Updating image tag`,
    parents: [commitSHA],
  });

  const newSHA = commit.data.sha;

  await octokit.git.updateRef({
    owner: owner,
    repo: repo,
    sha: newSHA,
    ref: "heads/master",
  });

  return;
}
