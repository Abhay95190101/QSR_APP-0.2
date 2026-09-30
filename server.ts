import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { SS_CAFE_LOGO_SVG } from './src/assets/ssCafeLogo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROFILE_PERSIST_FILE = path.resolve(__dirname, 'server_store_profile.json');

// --- Core Data Types for Server State ---
interface BillDetail {
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  total: number;
  settledAt?: string;
  paymentMethod?: string;
  notes?: string;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  tableNumber: number;
  diningZone: string;
  customerName?: string;
  items: any[];
  status: 'received' | 'preparing' | 'served' | 'settled' | 'cancelled';
  paymentStatus: 'pending' | 'paid_online' | 'cash_at_counter' | 'settled';
  createdAt: string;
  createdDate?: string;
  timestamp?: number;
  updatedAt: string;
  bill: BillDetail;
  soundAlertPlayed?: boolean;
}

interface StoreProfile {
  name: string;
  tagline: string;
  description?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone: string;
  email: string;
  website?: string;
  upiId: string;
  upiMerchantName?: string;
  taxRate: number;
  serviceCharge: number;
  gstin?: string;
  fssaiNumber?: string;
  currencySymbol: string;
  logoUrl: string;
  bannerUrl?: string;
  qrLogoUrl: string;
  wifiName?: string;
  wifiPassword?: string;
  isOpen: boolean;
  openingTime?: string;
  closingTime?: string;
  totalTables?: number;
  diningZones?: string[];
  ownerPin?: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  calories: number;
  prepTime: string;
  image: string;
  badge?: string;
  badgeType?: 'primary' | 'secondary' | 'neutral';
  isAvailable: boolean;
  isCustomizable?: boolean;
  dietary?: string;
  isFavorite?: boolean;
  translations?: Record<string, any>;
}

// Initial Data Defaults
const DEFAULT_STORE_PROFILE: StoreProfile = {
  name: 'SS Café and Restaurant',
  tagline: 'Chai, Tandoori Specials, Burgers & Grill Chicken',
  description: 'Authentic café delicacies, specialty tandoori kebabs, grilled chicken, fresh chai, burgers, and sandwiches.',
  address: 'Main Market Road',
  city: 'Kolkata',
  state: 'West Bengal',
  pincode: '700001',
  phone: '9987504251',
  email: 'SS.Cafeandrestaurant@gmail.com',
  website: 'https://sscafe.restaurant.in',
  upiId: '9647374072-3@ybl',
  upiMerchantName: 'SS Café and Restaurant',
  taxRate: 5.0,
  serviceCharge: 0,
  gstin: '',
  fssaiNumber: '',
  currencySymbol: '₹',
  logoUrl: SS_CAFE_LOGO_SVG,
  bannerUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  qrLogoUrl: SS_CAFE_LOGO_SVG,
  wifiName: 'SSCafe_FreeWiFi',
  wifiPassword: 'welcomesscafe',
  isOpen: true,
  openingTime: '09:00 AM',
  closingTime: '11:00 PM',
  totalTables: 12,
  diningZones: ['Main Café Hall', 'AC Dining Section', 'Outdoor Terrace'],
  ownerPin: '1234',
};

function loadPersistedProfile(): StoreProfile {
  try {
    if (fs.existsSync(PROFILE_PERSIST_FILE)) {
      const data = fs.readFileSync(PROFILE_PERSIST_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.name) {
        return { ...DEFAULT_STORE_PROFILE, ...parsed };
      }
    }
  } catch (err) {
    console.error('[Server Persistence] Failed to load store profile from file:', err);
  }
  return { ...DEFAULT_STORE_PROFILE };
}

function savePersistedProfile(prof: StoreProfile) {
  try {
    fs.writeFileSync(PROFILE_PERSIST_FILE, JSON.stringify(prof, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server Persistence] Failed to write store profile to file:', err);
  }
}

const INITIAL_CATEGORIES: string[] = [
  'চা (Tea)',
  'কফি (Coffee)',
  'স্টার্টার (Veg)',
  'নন-ভেজ স্টার্টার',
  'তন্দুরি স্পেশাল',
  'গ্রিল চিকেন',
  'বার্গার (Burger)',
  'স্যান্ডউইচ',
  'ম্যাগি (Maggi)',
];

const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'tea-ada',
    name: 'আদা চা (Ginger Tea)',
    category: 'চা (Tea)',
    price: 15,
    description: 'Fresh aromatic hot tea infused with crushed fresh ginger.',
    calories: 70,
    prepTime: '3-5 min',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'tea-masala',
    name: 'মশলা চা (Masala Tea)',
    category: 'চা (Tea)',
    price: 15,
    description: 'Traditional spiced tea with clove, cardamom, cinnamon, and black pepper.',
    calories: 75,
    prepTime: '3-5 min',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'tea-lemon',
    name: 'লেমন চা (Lemon Tea)',
    category: 'চা (Tea)',
    price: 10,
    description: 'Refreshing tangy black tea with fresh lemon juice and black salt.',
    calories: 35,
    prepTime: '2-4 min',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'tea-elach',
    name: 'এলাচ চা (Cardamom Tea)',
    category: 'চা (Tea)',
    price: 15,
    description: 'Rich milk tea flavored with fragrant green cardamom pods.',
    calories: 75,
    prepTime: '3-5 min',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'tea-tulsi',
    name: 'তুলসি চা (Tulsi Tea)',
    category: 'চা (Tea)',
    price: 15,
    description: 'Ayurvedic herbal tea with holy basil leaves for wellness and energy.',
    calories: 40,
    prepTime: '3-5 min',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'tea-green',
    name: 'গ্রিন টি (Green Tea)',
    category: 'চা (Tea)',
    price: 15,
    description: 'Pure antioxidant-rich brewed green tea leaves.',
    calories: 5,
    prepTime: '2-4 min',
    image: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'coffee-filter',
    name: 'ফিল্টার কফি (Filter Coffee)',
    category: 'কফি (Coffee)',
    price: 20,
    description: 'Rich South Indian style drip decoction coffee with frothy hot milk.',
    calories: 90,
    prepTime: '3-5 min',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'coffee-black',
    name: 'ব্ল্যাক কফি (Black Coffee)',
    category: 'কফি (Coffee)',
    price: 10,
    description: 'Strong hot black coffee for an instant energy boost.',
    calories: 10,
    prepTime: '2-3 min',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'coffee-cold',
    name: 'কোল্ড কফি (Cold Coffee)',
    category: 'কফি (Coffee)',
    price: 70,
    description: 'Thick chilled blended coffee with creamy milk and chocolate drizzle.',
    calories: 220,
    prepTime: '4-6 min',
    image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'starter-french-fries',
    name: 'ফ্রেঞ্চ ফ্রাইস (French Fries)',
    category: 'স্টার্টার (Veg)',
    price: 50,
    description: 'Golden crispy skin-on salted potato fries served with dip.',
    calories: 280,
    prepTime: '5-7 min',
    image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'starter-peri-peri-fries',
    name: 'পেরি পেরি ফ্রাইস (Peri Peri Fries)',
    category: 'স্টার্টার (Veg)',
    price: 60,
    description: 'Crispy golden fries tossed in fiery African peri peri spice mix.',
    calories: 290,
    prepTime: '5-7 min',
    image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'starter-cheese-fries',
    name: 'চিজ ফ্রেঞ্চ ফ্রাইস (Cheese French Fries)',
    category: 'স্টার্টার (Veg)',
    price: 70,
    description: 'Hot crispy fries smothered with rich melted cheddar cheese sauce.',
    calories: 380,
    prepTime: '6-8 min',
    image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'nv-chicken-pakora',
    name: 'চিকেন পাকোড়া (Chicken Pakora)',
    category: 'নন-ভেজ স্টার্টার',
    price: 120,
    description: 'Crunchy deep-fried spiced chicken fritters served with green chutney.',
    calories: 340,
    prepTime: '7-10 min',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'nv-chicken-lollipop',
    name: 'চিকেন ললিপপ (Chicken Lollipop)',
    category: 'নন-ভেজ স্টার্টার',
    price: 120,
    description: 'Frenched crispy chicken winglets seasoned with Oriental herbs and spices.',
    calories: 380,
    prepTime: '8-12 min',
    image: 'https://images.unsplash.com/photo-1527477321005-4d01d75ba890?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'nv-sauce-lollipop',
    name: 'সস ললিপপ (Sauce Lollipop)',
    category: 'নন-ভেজ স্টার্টার',
    price: 150,
    description: 'Crispy fried chicken lollipops tossed in spicy garlic sweet & sour glaze.',
    calories: 420,
    prepTime: '8-12 min',
    image: 'https://images.unsplash.com/photo-1527477321005-4d01d75ba890?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'nv-honey-garlic-wings',
    name: 'হানি গার্লিক চিকেন উইংস (Honey Garlic Wings)',
    category: 'নন-ভেজ স্টার্টার',
    price: 180,
    description: 'Crispy wings caramelized in savory honey, roasted garlic, and herbs.',
    calories: 450,
    prepTime: '8-12 min',
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'nv-paneer-tikka-starter',
    name: 'পনির টিক্কা (৬ পিস) (Paneer Tikka - 6 Pcs)',
    category: 'নন-ভেজ স্টার্টার',
    price: 180,
    description: 'Tender cottage cheese cubes marinated in spiced hung curd and bell peppers.',
    calories: 320,
    prepTime: '8-10 min',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'nv-kathi-kebab',
    name: 'কাঠি কাবাব (Kathi Kebab)',
    category: 'নন-ভেজ স্টার্টার',
    price: 50,
    description: 'Flavorsome char-grilled minced chicken skewer kebab on a stick.',
    calories: 190,
    prepTime: '6-8 min',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'nv-fish-finger',
    name: 'ফিশ ফিঙ্গার (৬ পিস) (Fish Finger - 6 Pcs)',
    category: 'নন-ভেজ স্টার্টার',
    price: 100,
    description: 'Breadcrumb-crusted boneless white fish fingers served with tartar sauce.',
    calories: 280,
    prepTime: '6-9 min',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'nv-fish-bbq',
    name: 'ফিশ বারবিকিউ (৫ পিস) (Fish BBQ - 5 Pcs)',
    category: 'নন-ভেজ স্টার্টার',
    price: 100,
    description: 'Smoky grilled fresh fish fillets marinated with BBQ spices and lemon.',
    calories: 260,
    prepTime: '8-10 min',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'tan-chicken-full',
    name: 'তন্দুরি চিকেন (ফুল) (Tandoori Chicken - Full)',
    category: 'তন্দুরি স্পেশাল',
    price: 400,
    description: 'Whole chicken marinated in yogurt & spices, roasted in clay oven.',
    calories: 780,
    prepTime: '15-20 min',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'tan-chicken-half',
    name: 'তন্দুরি চিকেন (হাফ) (Tandoori Chicken - Half)',
    category: 'তন্দুরি স্পেশাল',
    price: 210,
    description: 'Half tandoori chicken roasted to juicy perfection with mint chutney.',
    calories: 420,
    prepTime: '12-15 min',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'tan-chicken-quarter',
    name: 'তন্দুরি চিকেন (কোয়ার্টার) (Tandoori - Quarter)',
    category: 'তন্দুরি স্পেশাল',
    price: 100,
    description: 'Quarter portion tandoori chicken leg or breast piece.',
    calories: 220,
    prepTime: '10-12 min',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'tan-reshmi-kebab',
    name: 'রেশমি কাবাব (৬ পিস) (Reshmi Kebab - 6 Pcs)',
    category: 'তন্দুরি স্পেশাল',
    price: 150,
    description: 'Melt-in-mouth chicken chunks in cashew paste, cream, and mild spices.',
    calories: 360,
    prepTime: '10-12 min',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'tan-hariyali-tikka',
    name: 'হরিয়ালি টিক্কা (৬ পিস) (Hariyali Tikka - 6 Pcs)',
    category: 'তন্দুরি স্পেশাল',
    price: 150,
    description: 'Succulent chicken tikka infused with fresh mint, coriander, and spices.',
    calories: 310,
    prepTime: '10-12 min',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'tan-malai-tikka',
    name: 'মালাই চিকেন টিক্কা (৬ পিস) (Malai Tikka - 6 Pcs)',
    category: 'তন্দুরি স্পেশাল',
    price: 150,
    description: 'Rich and velvety chicken pieces in fresh cream, cheese, and cardamom.',
    calories: 390,
    prepTime: '10-12 min',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'tan-paneer-tikka',
    name: 'পনির টিক্কা (৬ পিস) (Paneer Tikka - 6 Pcs)',
    category: 'তন্দুরি স্পেশাল',
    price: 150,
    description: 'Smoky clay oven tandoori paneer skewers with grilled vegetables.',
    calories: 320,
    prepTime: '8-10 min',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'tan-chicken-wings',
    name: 'তন্দুরি চিকেন উইংস (৬ পিস) (Tandoori Wings - 6 Pcs)',
    category: 'তন্দুরি স্পেশাল',
    price: 200,
    description: 'Spicy clay-oven charred chicken wings with chatpata masala.',
    calories: 420,
    prepTime: '10-12 min',
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'grill-chicken',
    name: 'গ্রিল চিকেন (Grill Chicken - Full/Half/Quarter)',
    category: 'গ্রিল চিকেন',
    price: 400,
    description: 'Flavorsome oven grilled chicken (Full ₹400 / Half ₹210 / Quarter ₹100).',
    calories: 680,
    prepTime: '15-18 min',
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'alfam-chicken',
    name: 'আলফাম চিকেন (Alfam Chicken - Full/Half/Quarter)',
    category: 'গ্রিল চিকেন',
    price: 400,
    description: 'Authentic Arabian style char-grilled Alfam chicken (Full ₹400 / Half ₹200 / Quarter ₹100).',
    calories: 710,
    prepTime: '15-20 min',
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'burger-veg',
    name: 'ভেজ বার্গার (Veg Burger)',
    category: 'বার্গার (Burger)',
    price: 60,
    description: 'Crisp seasoned veggie patty, fresh tomato, cucumber & creamy burger sauce.',
    calories: 340,
    prepTime: '6-8 min',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'burger-chicken',
    name: 'চিকেন বার্গার (Chicken Burger)',
    category: 'বার্গার (Burger)',
    price: 80,
    description: 'Crispy fried chicken breast fillet with melted cheese and sauces.',
    calories: 460,
    prepTime: '7-9 min',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'burger-egg-omelette',
    name: 'এগ অমলেট বার্গার (Egg Omelette Burger)',
    category: 'বার্গার (Burger)',
    price: 50,
    description: 'Fluffy double egg masala omelette tucked in a soft toasted sesame bun.',
    calories: 310,
    prepTime: '5-7 min',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'sandwich-veg',
    name: 'ভেজ স্যান্ডউইচ (Veg Sandwich)',
    category: 'স্যান্ডউইচ',
    price: 60,
    description: 'Crisp vegetable sandwich with cucumber, tomato, potato & mint butter.',
    calories: 240,
    prepTime: '5-7 min',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'sandwich-chicken',
    name: 'চিকেন স্যান্ডউইচ (Chicken Sandwich)',
    category: 'স্যান্ডউইচ',
    price: 100,
    description: 'Juicy shredded chicken tossed in herb mayonnaise and toasted.',
    calories: 390,
    prepTime: '6-8 min',
    image: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'sandwich-paneer',
    name: 'পনির স্যান্ডউইচ (Paneer Sandwich)',
    category: 'স্যান্ডউইচ',
    price: 70,
    description: 'Grilled sandwich loaded with spiced paneer bhurji and herbs.',
    calories: 320,
    prepTime: '5-7 min',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'maggi-classic-veg',
    name: 'ক্লাসিক ভেজ ম্যাগি (Classic Veg Maggi)',
    category: 'ম্যাগি (Maggi)',
    price: 40,
    description: 'Classic favorite masala Maggi cooked with chopped veggies.',
    calories: 260,
    prepTime: '4-6 min',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'maggi-cheese',
    name: 'চিজ ম্যাগি (Cheese Maggi)',
    category: 'ম্যাগি (Maggi)',
    price: 60,
    description: 'Hot masala Maggi noodles topped with melted cheddar cheese.',
    calories: 350,
    prepTime: '5-7 min',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'maggi-tandoori',
    name: 'তন্দুরি ম্যাগি (Tandoori Maggi)',
    category: 'ম্যাগি (Maggi)',
    price: 70,
    description: 'Smoky tandoori spices and spicy sauce tossed masala noodles.',
    calories: 310,
    prepTime: '5-7 min',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Vegetarian',
  },
  {
    id: 'maggi-egg-cheese',
    name: 'এগ চিজ ম্যাগি (Egg Cheese Maggi)',
    category: 'ম্যাগি (Maggi)',
    price: 60,
    description: 'Scrambled eggs and melted creamy cheese with hot Maggi.',
    calories: 380,
    prepTime: '5-7 min',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
  {
    id: 'maggi-chicken',
    name: 'চিকেন ম্যাগি (Chicken Maggi)',
    category: 'ম্যাগি (Maggi)',
    price: 70,
    description: 'Tender shredded chicken chunks in piping hot Maggi noodles.',
    calories: 390,
    prepTime: '6-8 min',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
    isAvailable: true,
    dietary: 'Non-Veg',
  },
];

const INITIAL_ORDERS: OrderRecord[] = [];

// In-Memory Live State
let storeProfile: StoreProfile = loadPersistedProfile();
let menuCategories: string[] = [...INITIAL_CATEGORIES];
let menuItems: MenuItem[] = [...INITIAL_MENU_ITEMS];
let orders: OrderRecord[] = [...INITIAL_ORDERS];
let archivedOrders: OrderRecord[] = [];
let orderCounter = 105;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON Body parsing
  app.use(express.json({ limit: '15mb' }));

  // --- API Endpoints ---

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // 1. ORDERS API
  app.get('/api/orders', (req, res) => {
    const includeArchived = req.query.includeArchived === 'true';
    if (includeArchived) {
      const combined = [...orders, ...archivedOrders];
      const unique = Array.from(new Map(combined.map((o) => [o.id, o])).values());
      return res.json({ success: true, orders: unique });
    }
    res.json({ success: true, orders });
  });

  app.get('/api/reports/all-orders', (_req, res) => {
    const combined = [...orders, ...archivedOrders];
    const unique = Array.from(new Map(combined.map((o) => [o.id, o])).values());
    res.json({ success: true, orders: unique });
  });

  app.post('/api/orders', (req, res) => {
    try {
      const incoming = req.body as Partial<OrderRecord>;

      // Deduplicate if already exists
      if (incoming.id && orders.some((o) => o.id === incoming.id)) {
        const existing = orders.find((o) => o.id === incoming.id)!;
        return res.status(200).json({ success: true, order: existing });
      }

      orderCounter += 1;
      const orderNumber = incoming.orderNumber || `#SB-${orderCounter}`;
      const now = new Date();

      const newOrder: OrderRecord = {
        id: incoming.id || `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        orderNumber,
        tableNumber: incoming.tableNumber || 1,
        diningZone: incoming.diningZone || 'Main Dining Room',
        customerName: incoming.customerName || 'Dining Guest',
        items: incoming.items || [],
        bill: incoming.bill || {
          subtotal: 0,
          discount: 0,
          serviceCharge: 0,
          tax: 0,
          total: 0,
        },
        status: 'received',
        paymentStatus: 'pending',
        createdAt: incoming.createdAt || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdDate: incoming.createdDate || now.toISOString().slice(0, 10),
        timestamp: Date.now(),
        updatedAt: incoming.updatedAt || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      orders = [newOrder, ...orders.filter((o) => o.id !== newOrder.id)];
      console.log(`[Order API] Placed new order ${newOrder.orderNumber} for Table #${newOrder.tableNumber}`);

      res.status(201).json({ success: true, order: newOrder });
    } catch (err: any) {
      console.error('[Order API Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    let found = false;

    orders = orders.map((o) => {
      if (o.id === id) {
        found = true;
        return {
          ...o,
          status,
          updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
      return o;
    });

    if (found) {
      res.json({ success: true, status });
    } else {
      res.status(404).json({ success: false, error: 'Order not found' });
    }
  });

  app.patch('/api/orders/:id/bill', (req, res) => {
    const { id } = req.params;
    const { discount = 0, serviceCharge = 0, notes } = req.body;
    let updatedOrder: OrderRecord | null = null;

    orders = orders.map((o) => {
      if (o.id === id) {
        const taxable = Math.max(0, o.bill.subtotal - discount);
        const tax = (taxable * storeProfile.taxRate) / 100;
        const total = taxable + tax + serviceCharge;
        updatedOrder = {
          ...o,
          bill: {
            ...o.bill,
            discount,
            serviceCharge,
            tax,
            total,
            notes: notes !== undefined ? notes : o.bill.notes,
          },
        };
        return updatedOrder;
      }
      return o;
    });

    if (updatedOrder) {
      res.json({ success: true, order: updatedOrder });
    } else {
      res.status(404).json({ success: false, error: 'Order not found' });
    }
  });

  app.post('/api/orders/:id/settle', (req, res) => {
    const { id } = req.params;
    const { paymentMethod } = req.body;
    let updatedOrder: OrderRecord | null = null;

    orders = orders.map((o) => {
      if (o.id === id) {
        updatedOrder = {
          ...o,
          status: 'settled',
          paymentStatus: 'settled',
          bill: {
            ...o.bill,
            settledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            paymentMethod: paymentMethod || 'UPI / Online QR',
          },
        };
        return updatedOrder;
      }
      return o;
    });

    if (updatedOrder) {
      res.json({ success: true, order: updatedOrder });
    } else {
      res.status(404).json({ success: false, error: 'Order not found' });
    }
  });

  // 2. STORE PROFILE API
  app.get('/api/profile', (_req, res) => {
    res.json({ success: true, profile: storeProfile });
  });

  app.post('/api/profile', (req, res) => {
    storeProfile = { ...storeProfile, ...req.body };
    savePersistedProfile(storeProfile);
    console.log('[Server] Store profile updated & saved to disk. UPI ID:', storeProfile.upiId);
    res.json({ success: true, profile: storeProfile });
  });

  // 3. MENU API
  app.get('/api/menu', (_req, res) => {
    res.json({
      success: true,
      categories: menuCategories,
      items: menuItems,
    });
  });

  app.post('/api/menu/items', (req, res) => {
    const { item } = req.body;
    if (item && item.id) {
      const exists = menuItems.some((i) => i.id === item.id);
      if (exists) {
        menuItems = menuItems.map((i) => (i.id === item.id ? item : i));
      } else {
        menuItems = [item, ...menuItems];
      }
      res.json({ success: true, items: menuItems });
    } else {
      res.status(400).json({ success: false, error: 'Invalid item data' });
    }
  });

  app.delete('/api/menu/items/:id', (req, res) => {
    const { id } = req.params;
    menuItems = menuItems.filter((i) => i.id !== id);
    res.json({ success: true, items: menuItems });
  });

  app.patch('/api/menu/items/:id/availability', (req, res) => {
    const { id } = req.params;
    let nextVal = false;
    menuItems = menuItems.map((i) => {
      if (i.id === id) {
        nextVal = !i.isAvailable;
        return { ...i, isAvailable: nextVal };
      }
      return i;
    });
    res.json({ success: true, isAvailable: nextVal, items: menuItems });
  });

  app.post('/api/menu/categories', (req, res) => {
    const { category, action } = req.body;
    if (action === 'delete') {
      menuCategories = menuCategories.filter((c) => c !== category);
    } else if (category && !menuCategories.includes(category)) {
      menuCategories.push(category);
    }
    res.json({ success: true, categories: menuCategories });
  });

  // 4. DAY END MANUAL SETTLEMENT API
  app.post('/api/day-end', (req, res) => {
    try {
      const { closeStore = true, archiveOrders = true } = req.body;
      if (archiveOrders) {
        // Push current active orders to permanent archivedOrders ledger
        archivedOrders = [...orders, ...archivedOrders];
        orderCounter = 100;
        orders = [];
      }
      if (closeStore) {
        storeProfile.isOpen = false;
      }
      console.log(`[Day End] Operation completed on server. Store isOpen: ${storeProfile.isOpen}, Archived orders total: ${archivedOrders.length}`);
      res.json({
        success: true,
        message: 'Day end executed successfully',
        isOpen: storeProfile.isOpen,
        ordersCount: orders.length,
        archivedCount: archivedOrders.length,
      });
    } catch (err: any) {
      console.error('[Day End Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- VITE MIDDLEWARE (Dev vs Prod) ---
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Sizzle & Bun Restaurant Server listening on 0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Start Error]', err);
  process.exit(1);
});
