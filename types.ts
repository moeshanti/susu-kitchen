
export enum UserRole {
  ADMIN = 'SUSU', // The creator
  USER = 'USER'   // The family/friends
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  favorites: string[]; // List of Recipe IDs
  shoppingList: Ingredient[];
}

export interface Ingredient {
  id: string; // Unique ID for list management
  item: string;
  amount: string;
  baseAmount?: number; // For scaling logic (simplified)
  unit?: string;       // For scaling logic
  estimatedCost: number; // in dollars
  category: string; // e.g., 'Produce', 'Meat', 'Pantry'
  checked: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  instructionThumbnails?: string[]; // Array of base64 image strings matching instructions index
  tips: string;
  imageUrl?: string;
  videoUrl?: string;
  authorId: string;
  createdAt: number;
  tags: string[];
  servings: number;
  prepTime: string;
  cookTime?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  calories?: number;
}

export type ViewState = 'HOME' | 'RECIPE_DETAIL' | 'CREATE_RECIPE' | 'SHOPPING_LIST' | 'COOKING_MODE';

// Gemini related types
export interface RecipeGenResponse {
  title: string;
  description: string;
  ingredients: {
    item: string;
    amount: string;
    estimatedCost: number;
    category: string;
  }[];
  instructions: string[];
  tips: string;
  servings: number;
  prepTime: string;
  tags: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  calories: number;
}
