import { useTestDatabase } from './src/test/env.js';

// 每个测试进程都要指向测试库
useTestDatabase();
