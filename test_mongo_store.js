// test_mongo_store.js
require("dotenv").config();
const session = require('express-session');

console.log('Attempting to test connect-mongo initialization methods...');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/moodify_test';
const DB_NAME = "moodify";

if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set in your .env file. Please set it to a valid MongoDB connection string.");
    process.exit(1);
}

// Test case 1: require('connect-mongo') (assuming it exports the class directly)
try {
    const MongoStoreMethod1 = require('connect-mongo');
    const store1 = new MongoStoreMethod1({
        mongoUrl: MONGODB_URI,
        dbName: DB_NAME,
        collectionName: 'sessions_test_1'
    });
    console.log('Test 1 (new MongoStoreMethod1(...)): SUCCESS');
} catch (e) {
    console.error(`Test 1 (new MongoStoreMethod1(...)): FAILED - ${e.message}`);
}

// Test case 2: require('connect-mongo').create (as per current docs)
try {
    const MongoStoreMethod2 = require('connect-mongo');
    const store2 = MongoStoreMethod2.create({
        mongoUrl: MONGODB_URI,
        dbName: DB_NAME,
        collectionName: 'sessions_test_2'
    });
    console.log('Test 2 (MongoStoreMethod2.create(...)): SUCCESS');
} catch (e) {
    console.error(`Test 2 (MongoStoreMethod2.create(...)): FAILED - ${e.message}`);
}

// Test case 3: new (require('connect-mongo')) (common interop fix)
try {
    const store3 = new (require('connect-mongo'))({
        mongoUrl: MONGODB_URI,
        dbName: DB_NAME,
        collectionName: 'sessions_test_3'
    });
    console.log('Test 3 (new (require(...))(...)): SUCCESS');
} catch (e) {
    console.error(`Test 3 (new (require(...))(...)): FAILED - ${e.message}`);
}

// Test case 4: require('connect-mongo').default (if it's an ES Module default export)
try {
    const MongoStoreMethod4 = require('connect-mongo').default;
    const store4 = new MongoStoreMethod4({
        mongoUrl: MONGODB_URI,
        dbName: DB_NAME,
        collectionName: 'sessions_test_4'
    });
    console.log('Test 4 (new require(...).default(...)): SUCCESS');
} catch (e) {
    console.error(`Test 4 (new require(...).default(...)): FAILED - ${e.message}`);
}

console.log('\nFinished connect-mongo initialization tests.');
console.log('Please examine the output to see which method, if any, succeeded.');
console.log('Then, we can update server.js with the working syntax.');
