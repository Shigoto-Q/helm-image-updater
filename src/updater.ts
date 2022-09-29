import { Octokit } from "@octokit/rest";
import { Base64 } from "js-base64";
import { File } from "./interfaces";

export async function updateImage(
  octokit: Octokit,
  filepath: string,
  owner: string,
  repo: string,
  currentTag: string,
  newTag: string
) {
  const currentContent = await getFileContents(octokit, filepath, owner, repo);
  const replacedString = getUpdatedFile(currentContent, currentTag, newTag);
  commitChange(octokit, filepath, owner, repo, replacedString);
}

async function getFileContents(
  octokit: Octokit,
  filepath: string,
  owner: string,
  repo: string
): Promise<string> {
  const content = await octokit.repos.getContent({
    owner: owner,
    path: filepath,
    repo: repo,
  });

  const base64Decoded = Base64.decode(content.data["content"]);

  return base64Decoded;
}

function getUpdatedFile(
  contents: string,
  currentTag: string,
  newTag: string
): string {
  if (contents.indexOf(currentTag) < 0) {
    throw new Error("Specified current tag not found in file.");
  }

  return contents.replace(currentTag, newTag);
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
  console.log(currentSHA);

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
