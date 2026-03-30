export interface ActionImplementation {
  type: 'http_call' | 'function' | 'script' | 'tool';
  method?: string;
  endpoint?: string;
  timeout?: string;
  retry?: { max_attempts: number; backoff: 'exponential' | 'linear' };
  command?: string;
  interpreter?: string;
}

export interface ActionCondition {
  type: 'role' | 'record_exists' | 'assert' | 'custom';
  required_role?: string;
  record_id?: string;
  condition?: string;
}

export interface Action {
  action: string;
  description: string;
  input: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    description?: string;
    default?: any;
  };
  output: {
    type: 'object';
    properties: Record<string, any>;
    description?: string;
  };
  implementation: ActionImplementation;
  validation?: {
    pre_conditions: ActionCondition[];
    post_conditions: ActionCondition[];
  };
}
