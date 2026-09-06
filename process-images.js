const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const srcDir = '/Users/elainamarriott/.gemini/antigravity-ide/brain/0c5dbe0c-7f7b-4d08-af62-d4d267861daf';
const destDir = '/Users/elainamarriott/Documents/Flux Web Studio/FWS _Automate/src/assets/visuals';

const images = [
  { src: 'flux_system_hero_1788690358886.jpg', dest: 'flux-system-hero.webp' },
  { src: 'business_application_1788690367602.jpg', dest: 'business-application.webp' },
  { src: 'ai_application_1788690380001.jpg', dest: 'ai-application.webp' },
  { src: 'saas_product_1788690415868.jpg', dest: 'saas-product.webp' },
  { src: 'automation_system_1788690427053.jpg', dest: 'automation-system.webp' },
  { src: 'analytics_platform_1788690437713.jpg', dest: 'analytics-platform.webp' },
  { src: 'work_crm_concept_1788690483148.jpg', dest: 'work-crm-concept.webp' },
  { src: 'work_ai_knowledge_concept_1788690493757.jpg', dest: 'work-ai-knowledge-concept.webp' },
  { src: 'category_business_systems_1788690502466.jpg', dest: 'category-business-systems.webp' },
  { src: 'category_digital_products_1788690553023.jpg', dest: 'category-digital-products.webp' },
  { src: 'category_ai_automation_1788690562689.jpg', dest: 'category-ai-automation.webp' },
  { src: 'category_data_tools_1788690572008.jpg', dest: 'category-data-tools.webp' },
  { src: 'category_technical_security_1788690618853.jpg', dest: 'category-technical-security.webp' }
];

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

for (const img of images) {
  const srcPath = path.join(srcDir, img.src);
  const destPath = path.join(destDir, img.dest);
  
  if (fs.existsSync(srcPath)) {
    console.log(`Converting ${img.src} to ${img.dest}...`);
    try {
      execSync(`npx -y sharp-cli -i "${srcPath}" -o "${destPath}"`);
      console.log(`Success: ${img.dest}`);
    } catch (error) {
      console.error(`Failed to convert ${img.src}:`, error.message);
    }
  } else {
    console.log(`File not found: ${srcPath}`);
  }
}
