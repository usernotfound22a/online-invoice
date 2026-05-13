// init-db-mongodb.js — Initialize MongoDB with seed data
const bcrypt = require('bcryptjs');
const { Business, Customer, Product, Invoice, InvoiceItem, mongoose } = require('./lib/mongodb');

async function initializeDB() {
  try {
    console.log('🔄 Initializing MongoDB...');

    // Check and create admin user
    let admin = await Business.findOne({ email: 'admin@pokhara.local' });
    if (!admin) {
      const hash = bcrypt.hashSync('admin1234', 10);
      admin = await Business.create({
        email: 'admin@pokhara.local',
        password: hash,
        business_name: 'System Admin',
        is_admin: true,
        active: true
      });
      console.log('✅ Admin user created: admin@pokhara.local / admin1234');
    } else {
      console.log('ℹ️  Admin user already exists.');
    }

    // Check and create demo business
    let demo = await Business.findOne({ email: 'demo@pokhara.local' });
    if (!demo) {
      const hash = bcrypt.hashSync('demo1234', 10);
      demo = await Business.create({
        email: 'demo@pokhara.local',
        password: hash,
        business_name: 'Annapurna Traders Pvt. Ltd.',
        business_name_ne: 'अन्नपूर्ण ट्रेडर्स प्रा. लि.',
        address: 'Lakeside, Pokhara-6, Kaski',
        pan: '301234567',
        phone: '+977 61-456789',
        active: true
      });
      console.log('✅ Demo business created: demo@pokhara.local / demo1234');

      // Create sample customers
      const customers = [
        { name: 'Himalayan Cafe', name_ne: 'हिमालयन क्याफे', address: 'Damside, Pokhara', phone: '+977-9846123456', pan: '605432198' },
        { name: 'Sunita Sharma', name_ne: 'सुनिता शर्मा', address: 'Mahendrapul, Pokhara', phone: '+977-9856234567', email: 'sunita@email.com' },
        { name: 'Lake View Hotel', name_ne: 'लेक भ्यु होटल', address: 'Lakeside-6, Pokhara', phone: '+977-61-465789', email: 'info@lakeview.np', pan: '301987654' },
        { name: 'Ramesh Gurung', address: 'Bagar, Pokhara', phone: '+977-9866345678' },
        { name: 'Pokhara Bakery', name_ne: 'पोखरा बेकरी', address: 'Chipledhunga, Pokhara', phone: '+977-9876456789', pan: '302345678' }
      ];

      const createdCustomers = await Customer.insertMany(
        customers.map(c => ({ ...c, business_id: demo._id }))
      );
      console.log(`✅ Created ${createdCustomers.length} sample customers`);

      // Create sample products
      const products = [
        { name: 'Basmati Rice 25kg', name_ne: 'बासमती चामल २५ केजी', description: 'Premium long grain', price: 2800, unit: 'kg', category: 'Grocery', vat_applicable: true, stock: 50, low_stock_threshold: 10 },
        { name: 'Cooking Oil 1L', name_ne: 'खाने तेल १ लिटर', description: 'Sunflower oil', price: 320, unit: 'ltr', category: 'Grocery', vat_applicable: true, stock: 100, low_stock_threshold: 20 },
        { name: 'Espresso Coffee', name_ne: 'एस्प्रेसो कफी', description: 'Medium roast 250g', price: 850, unit: 'pcs', category: 'F&B', vat_applicable: true, stock: 30, low_stock_threshold: 5 },
        { name: 'Momo Plate', name_ne: 'मम प्लेट', description: 'Chicken/Veg 10pcs', price: 180, unit: 'plate', category: 'F&B', vat_applicable: true },
        { name: 'Milk Tea', name_ne: 'दूध चिया', description: 'Nepali style', price: 50, unit: 'cup', category: 'F&B', vat_applicable: false },
        { name: 'Delivery Service', name_ne: 'डेलिभरी सेवा', description: 'Within Pokhara valley', price: 300, unit: 'service', category: 'Service', vat_applicable: true },
        { name: 'Repair Hour', name_ne: 'मर्मत प्रति घण्टा', description: 'Electronics repair', price: 500, unit: 'hr', category: 'Service', vat_applicable: true },
        { name: 'Salon Haircut', name_ne: 'सैलुन कपाल काट्ने', description: 'Standard cut', price: 400, unit: 'service', category: 'Service', vat_applicable: false },
        { name: 'Mineral Water 1L', name_ne: 'मिनरल वाटर १ लिटर', description: 'Bottled water', price: 35, unit: 'ltr', category: 'Grocery', vat_applicable: true, stock: 200, low_stock_threshold: 30 },
        { name: 'Wai Wai Noodles', name_ne: 'वाइ वाइ चाउचाउ', description: 'Pack of 30', price: 660, unit: 'pcs', category: 'Grocery', vat_applicable: true, stock: 25, low_stock_threshold: 5 },
        { name: 'T-shirt Cotton', name_ne: 'कटन टी-शर्ट', description: 'Various sizes', price: 800, unit: 'pcs', category: 'Retail', vat_applicable: true, stock: 40, low_stock_threshold: 10 },
        { name: 'Mobile Charger', name_ne: 'मोबाइल चार्जर', description: 'Type-C 18W', price: 650, unit: 'pcs', category: 'Retail', vat_applicable: true, stock: 15, low_stock_threshold: 5 }
      ];

      const createdProducts = await Product.insertMany(
        products.map(p => ({ ...p, business_id: demo._id }))
      );
      console.log(`✅ Created ${createdProducts.length} sample products`);

    } else {
      console.log('ℹ️  Demo business already exists.');
    }

    console.log('✅ MongoDB initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }
}

initializeDB();
