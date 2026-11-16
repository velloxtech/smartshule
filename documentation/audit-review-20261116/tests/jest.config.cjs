const path=require('path');const os=require('os');const fs=require('fs');
process.env.NODE_ENV='test';process.env.DB_TYPE='in-memory';process.env.EMAIL_TEST_MODE='true';process.env.SMS_PROVIDER='simulator';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'smartshule-review-tests-'));
process.env.UPLOAD_DIR=path.join(temp,'uploads');process.env.WHATSAPP_SESSION_PATH=path.join(temp,'whatsapp');process.env.WHATSAPP_CONFIG_PATH=path.join(temp,'whatsapp.json');
module.exports={rootDir:path.resolve(__dirname,'../../..'),preset:'ts-jest',testEnvironment:'node',roots:['<rootDir>/documentation/audit-review-20261116/tests'],testMatch:['**/*.test.ts'],testTimeout:30000,maxWorkers:1,forceExit:true};
