export type DashScopeSubmitResp = {
  output: { task_id: string; task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' };
  request_id?: string;
};

export type DashScopePollImageResp = {
  output: {
    task_id: string;
    task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    code?: string;
    message?: string;
    choices?: Array<{ message?: { content?: Array<{ image?: string }> } }>;
  };
  request_id?: string;
};

export type DashScopePollVideoResp = {
  output: {
    task_id: string;
    task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    code?: string;
    message?: string;
    video_url?: string;
  };
  request_id?: string;
};
