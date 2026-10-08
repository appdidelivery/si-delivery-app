import { handleOccasionLifecycle } from '../server/lifecycleDispatch.js';

export default function handler(req, res) {
  return handleOccasionLifecycle(req, res, 'sun');
}
