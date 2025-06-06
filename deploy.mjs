#!/usr/bin/env zx
/// <reference path="node_modules/zx/build/globals.d.ts" />

if (!process.env.INPUT_INCLUDE_FROM) {
  echo`Missing INPUT_INCLUDE_FROM`;
  await $`exit 1`;
}

if (!process.env.INPUT_GITLAB_URL) {
  echo`Missing INPUT_GITLAB_URL`;
  await $`exit 1`;
}

if (!process.env.INPUT_GITLAB_TOKEN) {
  echo`Missing INPUT_GITLAB_TOKEN`;
  await $`exit 1`;
}

if (!process.env.INPUT_REPO_PATH) {
  echo`Missing INPUT_REPO_PATH`;
  await $`exit 1`;
}

if (!process.env.INPUT_REPO_BRANCH) {
  echo`Missing INPUT_REPO_BRANCH`;
  await $`exit 1`;
}

if (!process.env.INPUT_GIT_USER_EMAIL) {
  echo`Missing INPUT_GIT_USER_EMAIL`;
  await $`exit 1`;
}

if (!process.env.INPUT_GIT_USER_NAME) {
  echo`Missing INPUT_GIT_USER_NAME`;
  await $`exit 1`;
}

cd(process.env.GITHUB_WORKSPACE);
const shortHash = (await $`git rev-parse --short ${process.env.GITHUB_SHA}`).stdout.trim();

const gitlabDir = `${process.env.HOME}/gitlab-repo`;

echo(`::group::Checkout della repository GitLab`);
await $`git clone https://accesstoken:${process.env.INPUT_GITLAB_TOKEN}@${process.env.INPUT_GITLAB_URL} --branch ${process.env.INPUT_REPO_BRANCH} --single-branch ${gitlabDir}`;
cd(gitlabDir);
echo('::endgroup::');


const includePath = path.join(process.env.GITHUB_WORKSPACE, process.env.INPUT_INCLUDE_FROM);
if (!fs.existsSync(includePath)) {
  echo(chalk.red(`ℹ︎ Impossibile trovare il file ${includePath}, annullo il deploy.`));
  await $`exit 1`;
}

// Ci assicuriamo che il path della Repo (GitLab) termini con uno slash
const targetPath = process.env.INPUT_REPO_PATH.replace(/\/$/, '') + '/';
const protectFilters = (process.env.INPUT_PROTECT_FILTERS || '').split(',')
  .map(filter => filter.trim())
  .filter(filter => filter.length > 0)
  .flatMap(filter => ['--filter', `protect ${filter}`]);

echo(`::group::Copio i file da git a GitLab`);
await $`rsync -rc -v --include-from=${includePath} --exclude="*" ${protectFilters} ${process.env.GITHUB_WORKSPACE + '/'} ${targetPath} --delete --delete-excluded`;
echo(`::endgroup::`);

// Dopo l'rsync verifico che non ci siano file di Git
if (process.env.INPUT_ALLOW_GIT_FILES !== 'true') {
  echo(chalk.blue(`➤ Controllo i file nella working copy...`));  
  if (fs.existsSync(path.join(gitlabDir, '.github'))) {
    echo(chalk.red(`ℹ︎ Trovata cartella .github, annullo il deploy.`));
    await $`exit 1`;
  }
}

echo(`::group::Preparo i file per il commit`);
await $`git config user.email ${process.env.INPUT_GIT_USER_EMAIL}`;
await $`git config user.name ${process.env.INPUT_GIT_USER_NAME}`;
await $`git add .`;

const changes = (await $`git status --porcelain`).stdout.trim();
if (!changes) {
  echo(chalk.yellow(`➤ Nessun cambiamento da committare, esco.`));
  await $`exit 0`;
}
echo(chalk.blue(`✓ Trovati cambiamenti da committare:`));
echo(changes);
echo(`::endgroup::`);

const packageJsonPath = path.join(process.env.GITHUB_WORKSPACE, process.env.INPUT_PACKAGE_JSON_PATH);
const { version } = await fs.readJson(packageJsonPath);

const commitMessage = process.env.INPUT_COMMIT_MESSAGE
  .replace(/%version%/g, version)
  .replace(/%sha%/g, shortHash);
echo(chalk.cyan(`ℹ︎ Commit message: ${commitMessage}`));

if (process.env.INPUT_DRY_RUN !== 'false') {
  echo(chalk.yellow(`➤ Dry run: salto il commit.`));
}
else {
  echo(`::group::Effettuo il commit`);
  await $`git commit -m ${commitMessage}`;
  await $`git push origin HEAD`;
  echo(chalk.green('✓ Commit e push completati.'));
  echo(`::endgroup::`);
}