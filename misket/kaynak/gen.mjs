import fs from 'fs';
import { buildCourse, exportCourse } from './course.js';
fs.writeFileSync(new URL('../course.json', import.meta.url), JSON.stringify(exportCourse(buildCourse())));
console.log('course.json', (fs.statSync(new URL('../course.json', import.meta.url)).size / 1e6).toFixed(2), 'MB');
