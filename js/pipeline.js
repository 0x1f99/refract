'use strict';

const Pipeline = {
  async process(input, steps) {
    if (steps.length === 0) return { output: input, error: null, time: 0, stepOutputs: [] };

    const start = performance.now();
    const stepOutputs = [];
    let current = input;
    let error = null;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step.enabled) {
        stepOutputs.push({ input: current, output: current, error: null });
        continue;
      }

      const op = window.RefractOps.get(step.opId);
      if (!op) {
        error = { stepIndex: i, message: `Unknown operation: ${step.opId}` };
        stepOutputs.push({
          input: current,
          output: current,
          error: error.message,
        });
        break;
      }

      try {
        let result;
        if (op.async) {
          result = await op.execute(current, step.options);
        } else {
          result = op.execute(current, step.options);
        }
        stepOutputs.push({ input: current, output: result, error: null });
        current = result;
      } catch (e) {
        const msg = e.message || 'Unknown error';
        error = {
          stepIndex: i,
          opName: op.name,
          message: msg,
          inputSnippet: current.length > 80 ? current.slice(0, 80) + '...' : current,
        };
        stepOutputs.push({ input: current, output: '', error: msg });
        break;
      }
    }

    const time = performance.now() - start;
    return { output: error ? '' : current, error, time, stepOutputs };
  },
};

window.RefractPipeline = Pipeline;
