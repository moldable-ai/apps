import { Recipe } from '../lib/types'

export const DEMO_RECIPES: Recipe[] = [
  {
    id: 'demo-1',
    title: 'Perfect Pan-Seared Salmon',
    description:
      'Crispy skin, tender flakes, and a simple lemon butter glaze that elevates the natural flavors.',
    imageUrl:
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      'Salmon fillets',
      'Lemon',
      'Butter',
      'Garlic',
      'Fresh Thyme',
      'Sea Salt',
    ],
    instructions:
      '1. Pat salmon dry.\n2. Sear skin-side down for 5 mins.\n3. Flip and baste with lemon butter.',
    category: 'Seafood',
    cookingTime: '15 mins',
    difficulty: 'Medium',
    isFavorite: true,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Classic Basil Pesto Pasta',
    description:
      'The authentic Genoese way. Vibrant green, nutty, and bursting with fresh basil aroma.',
    imageUrl:
      'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      'Fresh Basil',
      'Pine Nuts',
      'Parmigiano-Reggiano',
      'Extra Virgin Olive Oil',
      'Pasta',
    ],
    instructions:
      '1. Toast pine nuts carefully.\n2. Blend basil, nuts, and garlic.\n3. Toss with pasta and pasta water.',
    category: 'Pasta',
    cookingTime: '20 mins',
    difficulty: 'Easy',
    isFavorite: false,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Spicy Tuna Crispy Rice',
    description:
      'The trendy sushi-inspired snack. Golden-fried rice cubes topped with creamy, spicy ahi tuna.',
    imageUrl:
      'https://images.unsplash.com/photo-1617196034183-421b4917c92d?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      'Sushi Rice',
      'Sashimi Grade Tuna',
      'Sriracha',
      'Japanese Mayo',
      'Jalapeños',
    ],
    instructions:
      '1. Prepare sushi rice and press.\n2. Fry rice cubes until golden.\n3. Top with spicy tuna mix.',
    category: 'Appetizers',
    cookingTime: '45 mins',
    difficulty: 'Hard',
    isFavorite: true,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    title: 'Summer Berry Galette',
    description:
      'A rustic, free-form tart filled with bursting blueberries and raspberries.',
    imageUrl:
      'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      'Mixed Berries',
      'Pie Crust',
      'Sugar',
      'Lemon Zest',
      'Egg Wash',
    ],
    instructions:
      '1. Roll out dough.\n2. Pile fruit in center.\n3. Fold edges and bake until golden.',
    category: 'Desserts',
    cookingTime: '55 mins',
    difficulty: 'Medium',
    isFavorite: false,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
