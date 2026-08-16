import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/database.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const createAdmin = async () => {
  try {
    await connectDB();
    console.log('[SQLite] Connected to database');

    const adminName = process.env.ADMIN_NAME || 'Drashti Optic Owner';
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@drashtioptic.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      console.log(`[Admin] User with email '${adminEmail}' already exists. Updating password...`);
      const salt = await bcrypt.genSalt(10);
      existingUser.passwordHash = await bcrypt.hash(adminPassword, salt);
      existingUser.name = adminName;
      existingUser.isActive = true;
      await existingUser.save();
      console.log('✅ [Admin] Password updated successfully.');
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash,
        isActive: true,
      });
      console.log(`✅ [Admin] Store Owner account created successfully for: ${adminEmail}`);
    }

    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ [Admin Error]', error.message);
    process.exit(1);
  }
};

createAdmin();
