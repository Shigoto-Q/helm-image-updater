"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateImage = void 0;
const js_base64_1 = require("js-base64");
const js_yaml_1 = require("js-yaml");
const lodash_1 = require("lodash");
function updateImage(octokit, filepath, owner, repo, imageKey, newTag) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentContent = yield getFileContents(octokit, filepath, owner, repo);
        const replaced = getUpdatedFile(currentContent, imageKey, newTag);
        commitChange(octokit, filepath, owner, repo, replaced);
    });
}
exports.updateImage = updateImage;
function getFileContents(octokit, filepath, owner, repo) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const content = yield octokit.repos.getContent({
                owner: owner,
                path: filepath,
                repo: repo,
            });
            const base64Decoded = js_base64_1.Base64.decode(content.data["content"]);
            return base64Decoded;
        }
        catch (err) {
            throw new Error("Error while fetching values file! Check if the path provided is correct.");
        }
    });
}
function getUpdatedFile(contents, imageKey, newTag) {
    const splitImageKey = imageKey.split('.');
    const imageKeyOnly = splitImageKey[splitImageKey.length - 1];
    if (contents.indexOf(imageKeyOnly) < 0) {
        throw new Error("Provided image key not found in file content!");
    }
    const valuesFile = (0, js_yaml_1.load)(contents);
    lodash_1._.set(valuesFile, imageKey, newTag);
    return (0, js_yaml_1.dump)(valuesFile);
}
function commitChange(octokit, filepath, owner, repo, newContent) {
    return __awaiter(this, void 0, void 0, function* () {
        const base64Encoded = js_base64_1.Base64.encode(newContent);
        const commits = yield octokit.repos.listCommits({
            owner: owner,
            repo: repo,
        });
        const commitSHA = commits.data[0].sha;
        const file = {
            name: filepath,
            contents: newContent,
        };
        const commitableFile = [
            {
                path: file.name,
                mode: "100644",
                type: "commit",
                content: file.contents,
            },
        ];
        const tree = yield octokit.git.createTree({
            owner: owner,
            repo: repo,
            tree: commitableFile,
            base_tree: commitSHA,
            message: "Updating image tag",
            parents: [commitSHA],
        });
        const currentSHA = tree.data.sha;
        const commit = yield octokit.git.createCommit({
            owner: owner,
            repo: repo,
            tree: currentSHA,
            message: `Updating image tag`,
            parents: [commitSHA],
        });
        const newSHA = commit.data.sha;
        yield octokit.git.updateRef({
            owner: owner,
            repo: repo,
            sha: newSHA,
            ref: "heads/master",
        });
        return;
    });
}
//# sourceMappingURL=updater.js.map