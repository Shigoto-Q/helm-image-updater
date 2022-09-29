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
function updateImage(octokit, filepath, owner, repo, currentTag, newTag) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentContent = yield getFileContents(octokit, filepath, owner, repo);
        const replacedString = getUpdatedFile(currentContent, currentTag, newTag);
        commitChange(octokit, filepath, owner, repo, replacedString);
    });
}
exports.updateImage = updateImage;
function getFileContents(octokit, filepath, owner, repo) {
    return __awaiter(this, void 0, void 0, function* () {
        const content = yield octokit.repos.getContent({
            owner: owner,
            path: filepath,
            repo: repo,
        });
        const base64Decoded = js_base64_1.Base64.decode(content.data["content"]);
        return base64Decoded;
    });
}
function getUpdatedFile(contents, currentTag, newTag) {
    if (contents.indexOf(currentTag) < 0) {
        throw new Error("Specified current tag not found in file.");
    }
    return contents.replace(currentTag, newTag);
}
function commitChange(octokit, filepath, owner, repo, newContent) {
    return __awaiter(this, void 0, void 0, function* () {
        const base64Encoded = js_base64_1.Base64.encode(newContent);
        const commits = yield octokit.repos.listCommits({
            owner: owner,
            repo: repo
        });
        const commitSHA = commits.data[0].sha;
        const file = {
            name: filepath,
            contents: newContent
        };
        const commitableFile = [{
                path: file.name,
                mode: '100644',
                type: 'commit',
                content: file.contents,
            }];
        const tree = yield octokit.git.createTree({
            owner: owner,
            repo: repo,
            tree: commitableFile,
            base_tree: commitSHA,
            message: 'Updating image tag',
            parents: [commitSHA],
        });
        const currentSHA = tree.data.sha;
        console.log(currentSHA);
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