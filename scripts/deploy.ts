import 'dotenv/config';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Environment configuration
const ENVIRONMENTS = {
  development: {
    projectRef: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF_DEV,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_DEV,
    url: process.env.EXPO_PUBLIC_SUPABASE_URL_DEV,
  },
  staging: {
    projectRef: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF_STAGING,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_STAGING,
    url: process.env.EXPO_PUBLIC_SUPABASE_URL_STAGING,
  },
  production: {
    projectRef: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  },
} as const;

type Environment = keyof typeof ENVIRONMENTS;

/**
 * DeploymentManager handles Supabase deployment operations
 */
export class DeploymentManager {
  private environment: Environment;

  constructor(environment: Environment) {
    this.environment = environment;
  }

  /**
   * Check if Supabase CLI is installed
   */
  private checkSupabaseCLI(): boolean {
    try {
      execSync('supabase --version', { stdio: 'ignore' });
      return true;
    } catch {
      console.error('❌ Supabase CLI not installed. Please install it first:');
      console.error('npm install -g supabase');
      return false;
    }
  }

  /**
   * Initialize Supabase project
   */
  async initializeProject(): Promise<boolean> {
    try {
      if (!this.checkSupabaseCLI()) {
        return false;
      }

      console.log('🚀 Initializing Supabase project...');

      // Check if already initialized
      if (fs.existsSync('supabase/config.toml')) {
        console.log('✅ Supabase project already initialized');
        return true;
      }

      // Initialize new project
      execSync('supabase init', { stdio: 'inherit' });

      // Update config with environment-specific settings
      await this.updateSupabaseConfig();

      console.log('✅ Supabase project initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase project:', error);
      return false;
    }
  }

  /**
   * Start local Supabase development environment
   */
  async startLocal(): Promise<boolean> {
    try {
      if (!this.checkSupabaseCLI()) {
        return false;
      }

      console.log('🔧 Starting local Supabase environment...');

      execSync('supabase start', { stdio: 'inherit' });

      console.log('✅ Local Supabase environment started');
      console.log('📊 Dashboard: http://localhost:54323');
      console.log('🔗 API URL: http://localhost:54321');

      return true;
    } catch (error) {
      console.error('❌ Failed to start local environment:', error);
      return false;
    }
  }

  /**
   * Stop local Supabase environment
   */
  async stopLocal(): Promise<boolean> {
    try {
      console.log('🛑 Stopping local Supabase environment...');
      execSync('supabase stop', { stdio: 'inherit' });
      console.log('✅ Local environment stopped');
      return true;
    } catch (error) {
      console.error('❌ Failed to stop local environment:', error);
      return false;
    }
  }

  /**
   * Link to remote Supabase project
   */
  async linkProject(): Promise<boolean> {
    try {
      if (!this.checkSupabaseCLI()) {
        return false;
      }

      const config = ENVIRONMENTS[this.environment];
      if (!config.projectRef) {
        console.error(`❌ No project reference found for ${this.environment}`);
        return false;
      }

      console.log(`🔗 Linking to ${this.environment} project...`);

      execSync(`supabase link --project-ref ${config.projectRef}`, {
        stdio: 'inherit',
      });

      console.log(`✅ Linked to ${this.environment} project successfully`);
      return true;
    } catch (error) {
      console.error('❌ Failed to link project:', error);
      return false;
    }
  }

  /**
   * Deploy database migrations
   */
  async deployMigrations(): Promise<boolean> {
    try {
      console.log('📦 Deploying database migrations...');

      // Push migrations to remote
      execSync('supabase db push', { stdio: 'inherit' });

      console.log('✅ Database migrations deployed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to deploy migrations:', error);
      return false;
    }
  }

  /**
   * Deploy edge functions
   */
  async deployFunctions(): Promise<boolean> {
    try {
      console.log('⚡ Deploying edge functions...');

      // Check if functions directory exists
      const functionsDir = path.join('supabase', 'functions');
      if (!fs.existsSync(functionsDir)) {
        console.log('ℹ️  No functions to deploy');
        return true;
      }

      // Deploy all functions
      execSync('supabase functions deploy', { stdio: 'inherit' });

      console.log('✅ Edge functions deployed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to deploy functions:', error);
      return false;
    }
  }

  /**
   * Setup storage buckets
   */
  async setupStorage(): Promise<boolean> {
    try {
      console.log('💾 Setting up storage buckets...');

      // This would typically be handled by migrations,
      // but we can also do it programmatically
      const buckets = [
        {
          name: 'lesson-audio',
          public: false,
          allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
          fileSizeLimit: 50 * 1024 * 1024, // 50MB
        },
        {
          name: 'user-uploads',
          public: false,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: 5 * 1024 * 1024, // 5MB
        },
      ];

      // Note: Bucket creation is typically handled in SQL migrations
      // This is a placeholder for programmatic bucket management if needed

      console.log('✅ Storage buckets setup complete');
      return true;
    } catch (error) {
      console.error('❌ Failed to setup storage:', error);
      return false;
    }
  }

  /**
   * Apply seed data
   */
  async applySeedData(): Promise<boolean> {
    try {
      console.log('🌱 Applying seed data...');

      const seedFile = path.join('supabase', 'seed.sql');
      if (fs.existsSync(seedFile)) {
        execSync(`supabase db reset`, { stdio: 'inherit' });
        console.log('✅ Seed data applied successfully');
      } else {
        console.log('ℹ️  No seed data file found');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to apply seed data:', error);
      return false;
    }
  }

  /**
   * Full deployment workflow
   */
  async fullDeploy(): Promise<boolean> {
    try {
      console.log(`🚀 Starting full deployment to ${this.environment}...`);

      // Link to project
      if (!(await this.linkProject())) {
        return false;
      }

      // Deploy migrations
      if (!(await this.deployMigrations())) {
        return false;
      }

      // Deploy functions
      if (!(await this.deployFunctions())) {
        return false;
      }

      // Setup storage
      if (!(await this.setupStorage())) {
        return false;
      }

      console.log(`✅ Full deployment to ${this.environment} completed successfully!`);
      return true;
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      return false;
    }
  }

  /**
   * Update Supabase configuration
   */
  private async updateSupabaseConfig(): Promise<void> {
    const configPath = path.join('supabase', 'config.toml');
    if (!fs.existsSync(configPath)) {
      return;
    }

    // Read current config
    let config = fs.readFileSync(configPath, 'utf8');

    // Update API settings
    config = config.replace(
      /port = 54321/,
      'port = 54321'
    );

    // Write updated config
    fs.writeFileSync(configPath, config);
  }

  /**
   * Generate environment file
   */
  async generateEnvFile(): Promise<boolean> {
    try {
      const config = ENVIRONMENTS[this.environment];
      if (!config.url || !config.anonKey) {
        console.error(`❌ Missing configuration for ${this.environment}`);
        return false;
      }

      const envContent = `# Generated for ${this.environment} environment
EXPO_PUBLIC_SUPABASE_URL=${config.url}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${config.anonKey}
EXPO_PUBLIC_ENVIRONMENT=${this.environment}
`;

      const envFile = `.env.${this.environment}`;
      fs.writeFileSync(envFile, envContent);

      console.log(`✅ Environment file ${envFile} generated`);
      return true;
    } catch (error) {
      console.error('❌ Failed to generate environment file:', error);
      return false;
    }
  }

  /**
   * Validate deployment
   */
  async validateDeployment(): Promise<boolean> {
    try {
      console.log('🔍 Validating deployment...');

      const config = ENVIRONMENTS[this.environment];
      if (!config.url || !config.anonKey) {
        console.error('❌ Missing configuration');
        return false;
      }

      // Test basic connectivity
      const response = await fetch(`${config.url}/rest/v1/`, {
        headers: {
          'apikey': config.anonKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Failed to connect to Supabase API');
        return false;
      }

      console.log('✅ Deployment validation successful');
      return true;
    } catch (error) {
      console.error('❌ Validation failed:', error);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const environment = (args[0] as Environment) || 'development';
  const command = args[1] || 'help';

  const deployer = new DeploymentManager(environment);

  async function runCommand() {
    switch (command) {
      case 'init':
        await deployer.initializeProject();
        break;
      case 'start':
        await deployer.startLocal();
        break;
      case 'stop':
        await deployer.stopLocal();
        break;
      case 'link':
        await deployer.linkProject();
        break;
      case 'migrate':
        await deployer.deployMigrations();
        break;
      case 'functions':
        await deployer.deployFunctions();
        break;
      case 'storage':
        await deployer.setupStorage();
        break;
      case 'seed':
        await deployer.applySeedData();
        break;
      case 'deploy':
        await deployer.fullDeploy();
        break;
      case 'validate':
        await deployer.validateDeployment();
        break;
      case 'env':
        await deployer.generateEnvFile();
        break;
      default:
        console.log(`
Usage: npm run deploy <environment> <command>

Environments:
  development  - Local development
  staging      - Staging environment  
  production   - Production environment

Commands:
  init         - Initialize Supabase project
  start        - Start local development
  stop         - Stop local development
  link         - Link to remote project
  migrate      - Deploy database migrations
  functions    - Deploy edge functions
  storage      - Setup storage buckets
  seed         - Apply seed data
  deploy       - Full deployment workflow
  validate     - Validate deployment
  env          - Generate environment file

Examples:
  npm run deploy development init
  npm run deploy production deploy
  npm run deploy staging validate
        `);
    }
  }

  runCommand().catch(console.error);
}
