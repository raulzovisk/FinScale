import { writeFileSync } from 'fs';
import { join } from 'path';

// Cria package.json no diretório de build para forçar CommonJS
const pkgPath = join(process.cwd(), 'dist-server', 'package.json');
const pkgContent = JSON.stringify({ type: 'commonjs' }, null, 2);

try {
    writeFileSync(pkgPath, pkgContent);
    console.log('✅ Created dist-server/package.json (type: commonjs)');
} catch (error) {
    console.error('❌ Failed to create dist-server/package.json:', error);
    process.exit(1);
}
