export interface Listing {
  id: string;
  type: 'experience' | 'homestay';
  name: string;
  status: 'active' | 'paused' | 'draft';
  location: string;
  upcomingBookings: number;
  basePrice: number;
  description: string;
  media: string[];
  details: {
    duration?: string;
    difficulty?: string;
    groupSize?: string;
    bedrooms?: number;
    bathrooms?: number;
    amenities?: string[];
  };
}

export interface Booking {
  id: string;
  listingId: string;
  listingName: string;
  travelerName: string;
  travelerEmail: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  date: string;
  time?: string;
  guests: number;
  amount: number;
  bookingType: 'experience' | 'homestay';
}

export interface Transaction {
  id: string;
  bookingId: string;
  listingName: string;
  date: string;
  amount: number;
  status: 'pending' | 'completed';
  type: 'booking' | 'payout';
}

export interface Message {
  id: string;
  conversationId: string;
  listingId: string;
  listingName: string;
  bookingId?: string;
  travelerName: string;
  lastMessage: string;
  timestamp: string;
  isRead: boolean;
  messages: {
    sender: 'partner' | 'traveler';
    text: string;
    timestamp: string;
  }[];
}

export interface Payout {
  id: string;
  amount: number;
  status: 'pending' | 'completed';
  date: string;
  transactionCount: number;
}

export const demoListings: Listing[] = [
  {
    id: 'lst-exp-001',
    type: 'experience',
    name: 'Summit Ridge Guided Trek',
    status: 'active',
    location: 'Northern Highlands',
    upcomingBookings: 3,
    basePrice: 120,
    description: 'Experience the breathtaking views from Summit Ridge with our expert mountain guides. This full-day trek takes you through ancient forests and alpine meadows.',
    media: ['https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg'],
    details: {
      duration: '8 hours',
      difficulty: 'Moderate',
      groupSize: '2-8 people',
    },
  },
  {
    id: 'lst-exp-002',
    type: 'experience',
    name: 'Dawn Photography Expedition',
    status: 'active',
    location: 'Eastern Peaks',
    upcomingBookings: 5,
    basePrice: 85,
    description: 'Capture the perfect sunrise from our secret vantage points. Includes photography guidance and equipment.',
    media: ['https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg'],
    details: {
      duration: '4 hours',
      difficulty: 'Easy',
      groupSize: '2-6 people',
    },
  },
  {
    id: 'lst-exp-003',
    type: 'experience',
    name: 'Heritage Trail Walking Tour',
    status: 'paused',
    location: 'Historic Zone',
    upcomingBookings: 0,
    basePrice: 65,
    description: 'Explore the cultural significance of the mountain trails with stories passed down through generations.',
    media: ['https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg'],
    details: {
      duration: '3 hours',
      difficulty: 'Easy',
      groupSize: '4-12 people',
    },
  },
  {
    id: 'lst-exp-004',
    type: 'experience',
    name: 'Wilderness Survival Skills',
    status: 'active',
    location: 'Northern Highlands',
    upcomingBookings: 2,
    basePrice: 150,
    description: 'Learn essential wilderness survival techniques from experienced guides in a hands-on environment.',
    media: ['https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg'],
    details: {
      duration: '6 hours',
      difficulty: 'Moderate',
      groupSize: '4-8 people',
    },
  },
  {
    id: 'lst-exp-005',
    type: 'experience',
    name: 'Moonlight Forest Walk',
    status: 'draft',
    location: 'Western Woods',
    upcomingBookings: 0,
    basePrice: 45,
    description: 'A magical evening experience walking through illuminated forest paths under the full moon.',
    media: ['https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg'],
    details: {
      duration: '2 hours',
      difficulty: 'Easy',
      groupSize: '6-15 people',
    },
  },
  {
    id: 'lst-hom-001',
    type: 'homestay',
    name: 'Riverside Mountain Cabin',
    status: 'active',
    location: 'Valley Region',
    upcomingBookings: 4,
    basePrice: 180,
    description: 'Cozy cabin with stunning river views, perfect for families or small groups seeking tranquility.',
    media: ['https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg'],
    details: {
      bedrooms: 3,
      bathrooms: 2,
      amenities: ['Kitchen', 'WiFi', 'Fireplace', 'Deck'],
    },
  },
  {
    id: 'lst-hom-002',
    type: 'homestay',
    name: 'Alpine View Lodge',
    status: 'active',
    location: 'Northern Highlands',
    upcomingBookings: 6,
    basePrice: 250,
    description: 'Luxury lodge with panoramic mountain views and modern amenities.',
    media: ['https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg'],
    details: {
      bedrooms: 4,
      bathrooms: 3,
      amenities: ['Kitchen', 'WiFi', 'Hot Tub', 'Game Room'],
    },
  },
  {
    id: 'lst-hom-003',
    type: 'homestay',
    name: 'Forest Edge Cottage',
    status: 'active',
    location: 'Western Woods',
    upcomingBookings: 2,
    basePrice: 120,
    description: 'Intimate cottage nestled at the forest edge, ideal for couples.',
    media: ['https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg'],
    details: {
      bedrooms: 1,
      bathrooms: 1,
      amenities: ['Kitchenette', 'WiFi', 'Garden'],
    },
  },
];

export const demoBookings: Booking[] = [
  {
    id: 'bkg-001',
    listingId: 'lst-exp-001',
    listingName: 'Summit Ridge Guided Trek',
    travelerName: 'Sarah Chen',
    travelerEmail: 'sarah.chen@email.com',
    status: 'pending',
    date: '2026-01-05',
    time: '08:00',
    guests: 2,
    amount: 240,
    bookingType: 'experience',
  },
  {
    id: 'bkg-002',
    listingId: 'lst-exp-002',
    listingName: 'Dawn Photography Expedition',
    travelerEmail: 'michael.torres@email.com',
    travelerName: 'Michael Torres',
    status: 'confirmed',
    date: '2026-01-04',
    time: '05:30',
    guests: 1,
    amount: 85,
    bookingType: 'experience',
  },
  {
    id: 'bkg-003',
    listingId: 'lst-hom-001',
    listingName: 'Riverside Mountain Cabin',
    travelerName: 'Emma Rodriguez',
    travelerEmail: 'emma.r@email.com',
    status: 'confirmed',
    date: '2026-01-08',
    guests: 4,
    amount: 1080,
    bookingType: 'homestay',
  },
  {
    id: 'bkg-004',
    listingId: 'lst-exp-001',
    listingName: 'Summit Ridge Guided Trek',
    travelerName: 'James Wilson',
    travelerEmail: 'j.wilson@email.com',
    status: 'confirmed',
    date: '2026-01-06',
    time: '08:00',
    guests: 4,
    amount: 480,
    bookingType: 'experience',
  },
  {
    id: 'bkg-005',
    listingId: 'lst-hom-002',
    listingName: 'Alpine View Lodge',
    travelerName: 'Lisa Anderson',
    travelerEmail: 'lisa.a@email.com',
    status: 'confirmed',
    date: '2026-01-10',
    guests: 6,
    amount: 2000,
    bookingType: 'homestay',
  },
  {
    id: 'bkg-006',
    listingId: 'lst-exp-002',
    listingName: 'Dawn Photography Expedition',
    travelerName: 'David Park',
    travelerEmail: 'david.park@email.com',
    status: 'pending',
    date: '2026-01-07',
    time: '05:30',
    guests: 2,
    amount: 170,
    bookingType: 'experience',
  },
  {
    id: 'bkg-007',
    listingId: 'lst-exp-004',
    listingName: 'Wilderness Survival Skills',
    travelerName: 'Rachel Kim',
    travelerEmail: 'rachel.kim@email.com',
    status: 'confirmed',
    date: '2026-01-12',
    time: '09:00',
    guests: 3,
    amount: 450,
    bookingType: 'experience',
  },
  {
    id: 'bkg-008',
    listingId: 'lst-hom-003',
    listingName: 'Forest Edge Cottage',
    travelerName: 'Tom Bradley',
    travelerEmail: 'tom.b@email.com',
    status: 'confirmed',
    date: '2026-01-15',
    guests: 2,
    amount: 720,
    bookingType: 'homestay',
  },
  {
    id: 'bkg-009',
    listingId: 'lst-exp-001',
    listingName: 'Summit Ridge Guided Trek',
    travelerName: 'Nina Patel',
    travelerEmail: 'nina.patel@email.com',
    status: 'completed',
    date: '2025-12-28',
    time: '08:00',
    guests: 2,
    amount: 240,
    bookingType: 'experience',
  },
  {
    id: 'bkg-010',
    listingId: 'lst-exp-002',
    listingName: 'Dawn Photography Expedition',
    travelerName: 'Alex Nguyen',
    travelerEmail: 'alex.n@email.com',
    status: 'completed',
    date: '2025-12-30',
    time: '05:30',
    guests: 1,
    amount: 85,
    bookingType: 'experience',
  },
  {
    id: 'bkg-011',
    listingId: 'lst-hom-001',
    listingName: 'Riverside Mountain Cabin',
    travelerName: 'Sophie Martin',
    travelerEmail: 'sophie.m@email.com',
    status: 'completed',
    date: '2025-12-20',
    guests: 4,
    amount: 1080,
    bookingType: 'homestay',
  },
  {
    id: 'bkg-012',
    listingId: 'lst-exp-004',
    listingName: 'Wilderness Survival Skills',
    travelerName: 'Chris Johnson',
    travelerEmail: 'chris.j@email.com',
    status: 'completed',
    date: '2025-12-22',
    time: '09:00',
    guests: 4,
    amount: 600,
    bookingType: 'experience',
  },
];

export const demoTransactions: Transaction[] = [
  { id: 'txn-001', bookingId: 'bkg-009', listingName: 'Summit Ridge Guided Trek', date: '2025-12-28', amount: 228, status: 'completed', type: 'booking' },
  { id: 'txn-002', bookingId: 'bkg-010', listingName: 'Dawn Photography Expedition', date: '2025-12-30', amount: 80.75, status: 'completed', type: 'booking' },
  { id: 'txn-003', bookingId: 'bkg-011', listingName: 'Riverside Mountain Cabin', date: '2025-12-20', amount: 1026, status: 'completed', type: 'booking' },
  { id: 'txn-004', bookingId: 'bkg-012', listingName: 'Wilderness Survival Skills', date: '2025-12-22', amount: 570, status: 'completed', type: 'booking' },
  { id: 'txn-005', bookingId: 'bkg-002', listingName: 'Dawn Photography Expedition', date: '2026-01-02', amount: 80.75, status: 'pending', type: 'booking' },
  { id: 'txn-006', bookingId: 'bkg-003', listingName: 'Riverside Mountain Cabin', date: '2026-01-02', amount: 1026, status: 'pending', type: 'booking' },
  { id: 'txn-007', bookingId: 'bkg-004', listingName: 'Summit Ridge Guided Trek', date: '2026-01-03', amount: 456, status: 'pending', type: 'booking' },
  { id: 'txn-008', bookingId: 'bkg-005', listingName: 'Alpine View Lodge', date: '2026-01-03', amount: 1900, status: 'pending', type: 'booking' },
  { id: 'txn-009', bookingId: 'bkg-007', listingName: 'Wilderness Survival Skills', date: '2026-01-03', amount: 427.50, status: 'pending', type: 'booking' },
  { id: 'txn-010', bookingId: 'bkg-008', listingName: 'Forest Edge Cottage', date: '2026-01-03', amount: 684, status: 'pending', type: 'booking' },
];

export const demoPayouts: Payout[] = [
  { id: 'pay-001', amount: 1904.75, status: 'completed', date: '2025-12-31', transactionCount: 4 },
  { id: 'pay-002', amount: 4574.25, status: 'pending', date: '2026-01-15', transactionCount: 6 },
];

export const demoMessages: Message[] = [
  {
    id: 'msg-001',
    conversationId: 'conv-001',
    listingId: 'lst-exp-001',
    listingName: 'Summit Ridge Guided Trek',
    bookingId: 'bkg-001',
    travelerName: 'Sarah Chen',
    lastMessage: 'What should I bring for the trek?',
    timestamp: '2026-01-03T14:30:00Z',
    isRead: false,
    messages: [
      { sender: 'traveler', text: 'Hi! I just booked the Summit Ridge trek for January 5th. Very excited!', timestamp: '2026-01-03T10:15:00Z' },
      { sender: 'partner', text: 'Thank you for booking! We\'re excited to have you. The weather forecast looks perfect.', timestamp: '2026-01-03T11:20:00Z' },
      { sender: 'traveler', text: 'What should I bring for the trek?', timestamp: '2026-01-03T14:30:00Z' },
    ],
  },
  {
    id: 'msg-002',
    conversationId: 'conv-002',
    listingId: 'lst-exp-002',
    listingName: 'Dawn Photography Expedition',
    bookingId: 'bkg-006',
    travelerName: 'David Park',
    lastMessage: 'Can we reschedule to January 8th?',
    timestamp: '2026-01-03T16:45:00Z',
    isRead: false,
    messages: [
      { sender: 'traveler', text: 'I have a booking for January 7th but need to change the date.', timestamp: '2026-01-03T16:30:00Z' },
      { sender: 'traveler', text: 'Can we reschedule to January 8th?', timestamp: '2026-01-03T16:45:00Z' },
    ],
  },
  {
    id: 'msg-003',
    conversationId: 'conv-003',
    listingId: 'lst-hom-001',
    listingName: 'Riverside Mountain Cabin',
    bookingId: 'bkg-003',
    travelerName: 'Emma Rodriguez',
    lastMessage: 'Looking forward to our stay!',
    timestamp: '2026-01-02T09:20:00Z',
    isRead: true,
    messages: [
      { sender: 'traveler', text: 'Hi! Are pets allowed at the cabin?', timestamp: '2026-01-01T14:00:00Z' },
      { sender: 'partner', text: 'Unfortunately we don\'t allow pets due to allergies of future guests. Hope you understand!', timestamp: '2026-01-01T16:30:00Z' },
      { sender: 'traveler', text: 'No problem, we\'ll arrange care for our dog. Looking forward to our stay!', timestamp: '2026-01-02T09:20:00Z' },
    ],
  },
  {
    id: 'msg-004',
    conversationId: 'conv-004',
    listingId: 'lst-hom-002',
    listingName: 'Alpine View Lodge',
    travelerName: 'Lisa Anderson',
    lastMessage: 'Is the hot tub available year-round?',
    timestamp: '2026-01-03T11:00:00Z',
    isRead: false,
    messages: [
      { sender: 'traveler', text: 'Hi! Considering booking for January 10th with my family.', timestamp: '2026-01-03T10:30:00Z' },
      { sender: 'traveler', text: 'Is the hot tub available year-round?', timestamp: '2026-01-03T11:00:00Z' },
    ],
  },
  {
    id: 'msg-005',
    conversationId: 'conv-005',
    listingId: 'lst-exp-004',
    listingName: 'Wilderness Survival Skills',
    bookingId: 'bkg-007',
    travelerName: 'Rachel Kim',
    lastMessage: 'Perfect, see you then!',
    timestamp: '2026-01-02T15:40:00Z',
    isRead: true,
    messages: [
      { sender: 'traveler', text: 'What\'s the minimum age for this experience?', timestamp: '2026-01-02T13:00:00Z' },
      { sender: 'partner', text: 'Minimum age is 16. All participants should be in good physical condition.', timestamp: '2026-01-02T14:15:00Z' },
      { sender: 'traveler', text: 'Perfect, see you then!', timestamp: '2026-01-02T15:40:00Z' },
    ],
  },
];
