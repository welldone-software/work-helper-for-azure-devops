
const evaluationIdsToIgnore = [];

const emptyEvaluationIdsToIgnore = () => {
  console.log('[azure/rerunFailedPrBuilds] - emptying evaluationIdsToIgnore');
  evaluationIdsToIgnore.splice(0);
};

const getDailyActivePullRequests = async () => {
  
  console.log('[azure/rerunFailedPrBuilds] - fetching pull requests');

  const pullRequests = await azureHelper.pullRequests.fetchPullRequests();
  const todayDateLocaleDateString = new Date().toLocaleDateString();

  return pullRequests.filter(({ creationDate, status }) => (
    (new Date(creationDate).toLocaleDateString() === todayDateLocaleDateString) &&
    (status === 'active')
  ));

};

const getFailedPrBuildsEvaluationIds = async () => {

  const dailyActivePullRequests = await getDailyActivePullRequests();

  const evaluationGroups = await Promise.all(
    dailyActivePullRequests.map(({ pullRequestId }) =>
      azureHelper.policy.fetchEvaluations(`vstfs:///CodeReview/CodeReviewId/${projectId}/${pullRequestId}`))
  );

  return evaluationGroups.reduce((res, group) => {
    
    const failedBuildEvaluation = group.find(evaluation => (
      evaluation.configuration.type.displayName === 'Build' &&
      evaluation.status === 'rejected'
    ));

    if (!failedBuildEvaluation) { return res; }

    return [...res, failedBuildEvaluation.evaluationId];

  }, []);
};

const rerunFailedPrBuilds = async () => {

  const failedPrBuildsEvaluationIds = await getFailedPrBuildsEvaluationIds();

  if (!failedPrBuildsEvaluationIds.length) {
    console.log('[azure/rerunFailedPrBuilds] - no failed builds for prs that were created today');
    return;
  }

  const filteredFailedPrBuildsEvaluationIds =
    failedPrBuildsEvaluationIds.filter(evaluationId =>
      !evaluationIdsToIgnore.includes(evaluationId));
  
  if (!filteredFailedPrBuildsEvaluationIds.length) {
    console.log('[azure/rerunFailedPrBuilds] - all evaluation ids filtered out!');
    return;
  }

  console.log('[azure/rerunFailedPrBuilds] - rerunning failed pr builds', failedPrBuildsEvaluationIds);

  return Promise.all(failedPrBuildsEvaluationIds.map(azureHelper.policy.requeBuildPolicyEvaluation));
};
