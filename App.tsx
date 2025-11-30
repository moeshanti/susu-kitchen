
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Recipe, ViewState, Ingredient, RecipeGenResponse } from './types';
import { Button } from './components/Button';
import { AudioRecorder } from './components/AudioRecorder';
import { WebcamCapture } from './components/WebcamCapture';
import { generateRecipeFromMedia, generateRecipeImage, generateRecipeVideo, askSusuWithGrounding, generateInstructionThumbnails } from './services/geminiService';

// --- Constants & Assets ---

// Main Hero Image: Hands preparing food/dough (Very stable ID)
const SUSU_IMAGE_URL = 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';

// Generic Fallback: High quality ingredients layout
const GENERIC_FALLBACK_URL = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

// --- Components ---

/**
 * SafeImage Component
 * Robust error handling to ensure no broken icons ever appear.
 */
interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

const SafeImage: React.FC<SafeImageProps> = ({ src, fallbackSrc, className, alt, style, ...props }) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    setImgSrc(src);
    setErrorCount(0);
  }, [src]);

  const handleError = () => {
    // 1st failure: Try the specific fallback provided (e.g. avatar) or the generic fallback
    if (errorCount === 0) {
      setImgSrc(fallbackSrc || GENERIC_FALLBACK_URL);
      setErrorCount(1);
    } 
    // 2nd failure: If fallback fails, stop trying to render an image tag to avoid loops
    else if (errorCount === 1) {
      setErrorCount(2);
    }
  };

  // Ultimate fallback: Render a styled placeholder div instead of an img tag
  if (errorCount >= 2) {
    return (
      <div 
        className={`${className} bg-stone-800 flex items-center justify-center text-stone-600 overflow-hidden relative`}
        style={style}
        role="img"
        aria-label={alt}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-500 via-stone-900 to-stone-950"></div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      onError={handleError}
      className={`${className} transition-opacity duration-300 ${errorCount > 0 ? 'grayscale-[20%]' : ''}`}
      alt={alt || "Image"}
      style={style}
      {...props}
    />
  );
};

// --- Mock Data ---

const DEFAULT_USERS: User[] = [
  { 
      id: 'susu', 
      name: 'Susu', 
      role: UserRole.ADMIN, 
      // Portrait of smiling older woman
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 
      favorites: [], 
      shoppingList: [] 
  },
  { 
      id: 'dad', 
      name: 'Papa Joe', 
      role: UserRole.USER, 
      // Older man
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 
      favorites: [], 
      shoppingList: [] 
  },
  { 
      id: 'kid1', 
      name: 'Sofia', 
      role: UserRole.USER, 
      // Young woman
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', 
      favorites: [], 
      shoppingList: [] 
  },
  {
      id: 'kid2',
      name: 'Leo', 
      role: UserRole.USER, 
      // Young man
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      favorites: [], 
      shoppingList: [] 
  }
];

const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'rec-1',
    title: 'Susu\'s Sunday Gravy',
    description: 'The secret family tomato sauce slowly simmered with pork ribs and meatballs. A Sunday tradition that brings everyone to the table.',
    ingredients: [
      { id: 'ing-1', item: 'Pork Ribs', amount: '1 lb', estimatedCost: 8.50, category: 'Meat', checked: false },
      { id: 'ing-2', item: 'San Marzano Tomatoes', amount: '2 cans', estimatedCost: 6.00, category: 'Pantry', checked: false },
      { id: 'ing-3', item: 'Garlic', amount: '5 cloves', estimatedCost: 0.50, category: 'Produce', checked: false },
      { id: 'ing-4', item: 'Fresh Basil', amount: '1 bunch', estimatedCost: 2.50, category: 'Produce', checked: false }
    ],
    instructions: [
        'Sear the pork ribs in a heavy pot until browned on all sides.', 
        'Remove meat, add minced garlic and sauté until fragrant (don\'t burn it!).', 
        'Crush the tomatoes by hand and add them to the pot with the juices.',
        'Return meat to pot, add basil, and simmer on low for at least 4 hours.'
    ],
    tips: 'Don\'t rush the onions! Let them caramelize slowly for the best sweetness.',
    // Hearty stew/sauce
    imageUrl: 'https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    authorId: 'susu',
    createdAt: Date.now(),
    tags: ['Italian', 'Dinner', 'Slow Cook'],
    servings: 6,
    prepTime: '4 hours',
    difficulty: 'Medium',
    calories: 450
  },
  {
    id: 'rec-2',
    title: 'Lemon Ricotta Pancakes',
    description: 'Fluffy, light, and zesty. These pancakes are perfect for a special birthday breakfast.',
    ingredients: [
       { id: 'ing-2-1', item: 'Ricotta Cheese', amount: '1 cup', estimatedCost: 4.00, category: 'Dairy', checked: false },
       { id: 'ing-2-2', item: 'Lemons', amount: '2', estimatedCost: 1.50, category: 'Produce', checked: false },
       { id: 'ing-2-3', item: 'Flour', amount: '1.5 cups', estimatedCost: 0.50, category: 'Pantry', checked: false }
    ],
    instructions: [
        'Whisk flour, sugar, and baking powder.',
        'In another bowl, mix ricotta, eggs, milk, and lemon zest.',
        'Fold wet into dry ingredients gently. Do not overmix!',
        'Cook on buttered griddle until golden.'
    ],
    tips: 'Use fresh ricotta for the best texture.',
    // Bright pancakes
    imageUrl: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    authorId: 'susu',
    createdAt: Date.now(),
    tags: ['Breakfast', 'Sweet', 'Easy'],
    servings: 4,
    prepTime: '20 mins',
    difficulty: 'Easy',
    calories: 320
  },
  {
      id: 'rec-3',
      title: 'Grandma\'s Stuffed Vine Leaves',
      description: 'Delicate vine leaves rolled with aromatic rice, pine nuts, and currants. A labor of love.',
      ingredients: [
          { id: 'ing-3-1', item: 'Grape Leaves', amount: '1 jar', estimatedCost: 5.00, category: 'Pantry', checked: false },
          { id: 'ing-3-2', item: 'Short Grain Rice', amount: '2 cups', estimatedCost: 2.00, category: 'Pantry', checked: false },
          { id: 'ing-3-3', item: 'Dill & Mint', amount: '1 bunch each', estimatedCost: 3.00, category: 'Produce', checked: false },
          { id: 'ing-3-4', item: 'Lemon Juice', amount: '1/2 cup', estimatedCost: 1.00, category: 'Produce', checked: false }
      ],
      instructions: [
          'Rinse the grape leaves to remove brine.',
          'Mix rice with herbs, lemon, and olive oil.',
          'Place a spoonful of filling on a leaf, fold sides, and roll tight.',
          'Stack tightly in a pot, cover with water and lemon, and simmer.'
      ],
      tips: 'Place a heavy plate on top of the rolls while cooking to keep them tight.',
      // Stuffed leaves/dolma
      imageUrl: 'https://images.unsplash.com/photo-1606923829571-0f2636499681?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      authorId: 'susu',
      createdAt: Date.now(),
      tags: ['Appetizer', 'Vegetarian', 'Difficult'],
      servings: 8,
      prepTime: '2 hours',
      difficulty: 'Hard',
      calories: 150
  },
  {
      id: 'rec-4',
      title: 'Chicken Maqluba',
      description: 'The famous "Upside Down" rice dish with layers of eggplant, cauliflower, and spiced chicken.',
      ingredients: [
          { id: 'ing-4-1', item: 'Chicken Thighs', amount: '6 pieces', estimatedCost: 8.00, category: 'Meat', checked: false },
          { id: 'ing-4-2', item: 'Eggplant', amount: '1 large', estimatedCost: 2.00, category: 'Produce', checked: false },
          { id: 'ing-4-3', item: 'Cauliflower', amount: '1 head', estimatedCost: 3.00, category: 'Produce', checked: false },
          { id: 'ing-4-4', item: 'Basmati Rice', amount: '3 cups', estimatedCost: 3.00, category: 'Pantry', checked: false }
      ],
      instructions: [
          'Fry eggplant and cauliflower slices until golden.',
          'Boil chicken with aromatics (cardamom, cinnamon) to make broth.',
          'Layer veggies, chicken, and soaked rice in a pot.',
          'Add broth and cook. Flip upside down onto a platter to serve!'
      ],
      tips: 'Let the pot rest for 15 minutes before flipping to hold the shape.',
      // Chicken and rice dish
      imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      authorId: 'susu',
      createdAt: Date.now(),
      tags: ['Dinner', 'Showstopper', 'Family'],
      servings: 6,
      prepTime: '1.5 hours',
      difficulty: 'Hard',
      calories: 600
  },
  {
      id: 'rec-5',
      title: 'Honey Walnut Baklava',
      description: 'Crispy layers of phyllo dough filled with crushed walnuts and soaked in orange blossom syrup.',
      ingredients: [
          { id: 'ing-5-1', item: 'Phyllo Dough', amount: '1 pack', estimatedCost: 4.00, category: 'Frozen', checked: false },
          { id: 'ing-5-2', item: 'Walnuts', amount: '3 cups', estimatedCost: 10.00, category: 'Pantry', checked: false },
          { id: 'ing-5-3', item: 'Butter', amount: '2 sticks', estimatedCost: 3.00, category: 'Dairy', checked: false },
          { id: 'ing-5-4', item: 'Honey', amount: '1 cup', estimatedCost: 6.00, category: 'Pantry', checked: false }
      ],
      instructions: [
          'Layer buttered phyllo sheets in a pan.',
          'Spread nut mixture every few layers.',
          'Cut into diamond shapes BEFORE baking.',
          'Pour cold syrup over hot pastry immediately after baking.'
      ],
      tips: 'The syrup must be cold and the baklava hot for it to stay crispy!',
      // Baklava
      imageUrl: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      authorId: 'susu',
      createdAt: Date.now(),
      tags: ['Dessert', 'Sweet', 'Party'],
      servings: 12,
      prepTime: '1 hour',
      difficulty: 'Medium',
      calories: 400
  },
  {
      id: 'rec-6',
      title: 'Spicy Moroccan Fish Stew',
      description: 'White fish poached in a spicy tomato and pepper sauce with preserved lemons.',
      ingredients: [
          { id: 'ing-6-1', item: 'White Fish Fillets', amount: '4 fillets', estimatedCost: 12.00, category: 'Meat', checked: false },
          { id: 'ing-6-2', item: 'Bell Peppers', amount: '3 mixed', estimatedCost: 3.00, category: 'Produce', checked: false },
          { id: 'ing-6-3', item: 'Paprika & Cumin', amount: '2 tbsp', estimatedCost: 1.00, category: 'Pantry', checked: false },
          { id: 'ing-6-4', item: 'Cilantro', amount: '1 bunch', estimatedCost: 1.00, category: 'Produce', checked: false }
      ],
      instructions: [
          'Sauté peppers and garlic with spices.',
          'Add tomatoes and simmer to make a thick sauce.',
          'Nestle fish into the sauce and cover.',
          'Cook gently for 10-15 minutes. Garnish with cilantro.'
      ],
      tips: 'Serve with crusty bread to soak up the sauce.',
      // Fish/Tagine
      imageUrl: 'https://images.unsplash.com/photo-1513222858102-4c280147cb23?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      authorId: 'susu',
      createdAt: Date.now(),
      tags: ['Dinner', 'Seafood', 'Healthy'],
      servings: 4,
      prepTime: '40 mins',
      difficulty: 'Medium',
      calories: 350
  }
];

// --- Main App ---
const App: React.FC = () => {
  // -- Global State --
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USERS[0]);
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  
  // -- UI State --
  const [view, setView] = useState<ViewState>('HOME');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // -- Feature State --
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [askSusuQuery, setAskSusuQuery] = useState('');
  const [susuResponse, setSusuResponse] = useState<{text: string, sources: any[]} | null>(null);
  const [isAskingSusu, setIsAskingSusu] = useState(false);
  const [isAskSusuOpen, setIsAskSusuOpen] = useState(false);

  // -- Creation State --
  const [isGenerating, setIsGenerating] = useState(false);
  const [creationStep, setCreationStep] = useState<'MEDIA' | 'REVIEW'>('MEDIA');
  const [draftRecipe, setDraftRecipe] = useState<Partial<Recipe> | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // -- Persistence --
  useEffect(() => {
    const savedUsers = localStorage.getItem('susu_app_users');
    const savedRecipes = localStorage.getItem('susu_app_recipes');
    
    if (savedUsers) setUsers(JSON.parse(savedUsers));
    if (savedRecipes) setRecipes(JSON.parse(savedRecipes));
  }, []);

  useEffect(() => {
    localStorage.setItem('susu_app_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('susu_app_recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    setUsers(prev => prev.map(u => u.id === currentUser.id ? currentUser : u));
  }, [currentUser]);

  // -- Helpers --
  const speak = (text: string) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = window.speechSynthesis.getVoices().find(v => v.name.includes('Google US English')) || null;
      window.speechSynthesis.speak(utterance);
  };

  // Analyze text to find an appropriate action icon
  const getStepActionIcon = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('chop') || lower.includes('slice') || lower.includes('cut') || lower.includes('mince') || lower.includes('dice')) return '🔪';
    if (lower.includes('boil') || lower.includes('simmer') || lower.includes('stew') || lower.includes('poach')) return '🍲';
    if (lower.includes('fry') || lower.includes('sauté') || lower.includes('sear') || lower.includes('brown')) return '🍳';
    if (lower.includes('bake') || lower.includes('roast') || lower.includes('broil') || lower.includes('oven')) return '🔥';
    if (lower.includes('mix') || lower.includes('whisk') || lower.includes('stir') || lower.includes('combine') || lower.includes('blend')) return '🥣';
    if (lower.includes('serve') || lower.includes('plate') || lower.includes('garnish') || lower.includes('top with')) return '🍽️';
    if (lower.includes('wash') || lower.includes('rinse') || lower.includes('clean') || lower.includes('drain')) return '💧';
    if (lower.includes('peel') || lower.includes('zest')) return '🍋';
    if (lower.includes('pour') || lower.includes('add') || lower.includes('sprinkle') || lower.includes('season')) return '🧂';
    if (lower.includes('roll') || lower.includes('knead') || lower.includes('fold') || lower.includes('wrap')) return '🥐';
    if (lower.includes('cool') || lower.includes('chill') || lower.includes('refrigerate') || lower.includes('freeze')) return '❄️';
    return '👩‍🍳';
  };

  // -- Action Handlers --

  const handleSwitchUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
        setCurrentUser(user);
        setIsUserMenuOpen(false);
        setView('HOME');
    }
  };

  const handleUpdateAvatar = (imageBase64: string) => {
    const updatedUser = { ...currentUser, avatar: imageBase64 };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setIsProfileModalOpen(false);
    setIsUserMenuOpen(false);
  };

  const handleGenerateRecipe = async (audioBlob: Blob) => {
    setIsGenerating(true);
    try {
      const genData = await generateRecipeFromMedia(audioBlob, capturedImage || undefined);
      
      const newRecipe: Partial<Recipe> = {
        ...genData,
        id: `rec-${Date.now()}`,
        authorId: currentUser.id,
        createdAt: Date.now(),
        ingredients: genData.ingredients.map((ing, idx) => ({
            ...ing,
            id: `ing-${Date.now()}-${idx}`,
            checked: false
        })),
        imageUrl: capturedImage || undefined 
      };
      
      setDraftRecipe(newRecipe);
      setCreationStep('REVIEW');
      
      if (!capturedImage && newRecipe.title && newRecipe.description) {
         generateRecipeImage(newRecipe.title, newRecipe.description)
           .then(url => setDraftRecipe(prev => prev ? ({ ...prev, imageUrl: url }) : null));
      }

    } catch (e) {
      console.error(e);
      alert("Susu didn't quite catch that. Try again!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRecipe = () => {
    if (draftRecipe && draftRecipe.title) {
        setRecipes(prev => [draftRecipe as Recipe, ...prev]);
        setDraftRecipe(null);
        setCapturedImage(null);
        setCreationStep('MEDIA');
        setView('HOME');
    }
  };

  const handleGenerateVideo = async () => {
      if (!draftRecipe || !draftRecipe.title) return;
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        const hasKey = await aiStudio.hasSelectedApiKey();
        if (!hasKey) {
            try { await aiStudio.openSelectKey(); } catch (e) { return; }
        }
      }

      setIsGenerating(true);
      try {
          // Pass Susu's image as fallback/persona
          const videoUrl = await generateRecipeVideo(draftRecipe.title, draftRecipe.imageUrl, SUSU_IMAGE_URL);
          setDraftRecipe(prev => prev ? ({ ...prev, videoUrl }) : null);
      } catch (e) {
          console.error(e);
          alert("Video generation failed or quota exceeded.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleGenerateVideoForActiveRecipe = async () => {
      if (!selectedRecipe) return;
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        const hasKey = await aiStudio.hasSelectedApiKey();
        if (!hasKey) {
            try { await aiStudio.openSelectKey(); } catch (e) { return; }
        }
      }

      setIsGenerating(true);
      try {
          // Pass Susu's image as fallback/persona
          const videoUrl = await generateRecipeVideo(selectedRecipe.title, selectedRecipe.imageUrl, SUSU_IMAGE_URL);
          
          const updatedRecipe = { ...selectedRecipe, videoUrl };
          setSelectedRecipe(updatedRecipe);
          setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
      } catch (e) {
          console.error(e);
          alert("Video generation failed. Please try again.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleVisualizeSteps = async () => {
      if (!selectedRecipe) return;
      
      setIsGenerating(true);
      try {
          const thumbnails = await generateInstructionThumbnails(selectedRecipe.instructions);
          
          const updatedRecipe = { ...selectedRecipe, instructionThumbnails: thumbnails };
          setSelectedRecipe(updatedRecipe);
          setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
      } catch (e) {
          console.error(e);
          alert("Could not generate visuals. Please try again.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleAskSusu = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!askSusuQuery.trim()) return;
      
      setIsAskingSusu(true);
      try {
          const context = selectedRecipe ? `${selectedRecipe.title}: ${selectedRecipe.description}` : undefined;
          const result = await askSusuWithGrounding(askSusuQuery, context);
          setSusuResponse(result);
      } catch (e) {
          setSusuResponse({ text: "Sorry love, I'm having a bit of trouble connecting to the internet.", sources: []});
      } finally {
          setIsAskingSusu(false);
      }
  };

  const addToShoppingList = (ingredients: Ingredient[]) => {
      const multiplier = servingsMultiplier;
      const newItems = ingredients.map(ing => ({
          ...ing,
          item: `${ing.item} ${multiplier > 1 ? `(x${multiplier})` : ''}`,
          id: `shop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          checked: false
      }));
      
      setCurrentUser(prev => ({
          ...prev,
          shoppingList: [...prev.shoppingList, ...newItems]
      }));
      alert("Added to your shopping list!");
  };

  // -- Render Helpers --

  const renderHeader = () => (
    <header className="fixed top-0 left-0 right-0 z-50 bg-stone-950/80 backdrop-blur-md border-b border-stone-800 px-6 py-4 flex items-center justify-between shadow-2xl transition-all duration-300">
      <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setView('HOME')}>
        <span className="text-3xl transform group-hover:scale-110 transition-transform">🍳</span>
        <div>
            <h1 className="text-xl font-serif font-bold text-stone-100 leading-tight">Susu's Kitchen</h1>
            <p className="text-[10px] text-amber-500 tracking-widest uppercase">Made with Love</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-6">
        <button onClick={() => setView('SHOPPING_LIST')} className="relative group">
           <div className="p-2 text-stone-400 group-hover:text-amber-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
           </div>
           {currentUser.shoppingList.length > 0 && (
             <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 rounded-full text-[10px] font-bold flex items-center justify-center text-white border-2 border-stone-900">
                 {currentUser.shoppingList.length}
             </span>
           )}
        </button>

        <div className="relative">
            <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 bg-stone-800/50 hover:bg-stone-800 rounded-full pl-1 pr-4 py-1 border border-stone-700 transition-all duration-300"
            >
                <SafeImage 
                    src={currentUser.avatar} 
                    alt="avatar" 
                    className="w-8 h-8 rounded-full border border-stone-600 object-cover" 
                />
                <span className="text-sm font-medium text-stone-200">{currentUser.name}</span>
            </button>
            
            {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-stone-850 rounded-lg shadow-xl border border-stone-700 py-1 overflow-hidden animate-fade-in z-50">
                    <div className="px-4 py-3 border-b border-stone-800">
                        <button 
                            onClick={() => setIsProfileModalOpen(true)}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold py-2 rounded transition-colors"
                        >
                            Edit My Avatar
                        </button>
                    </div>
                    <div className="px-4 py-2 text-xs text-stone-500 uppercase tracking-wider border-b border-stone-800">Switch Profile</div>
                    {users.map(u => (
                        <button 
                            key={u.id}
                            onClick={() => handleSwitchUser(u.id)}
                            className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-stone-800 transition-colors ${u.id === currentUser.id ? 'bg-stone-800/50 text-amber-500' : 'text-stone-300'}`}
                        >
                            <SafeImage src={u.avatar} className="w-6 h-6 rounded-full object-cover" />
                            <span className="text-sm">{u.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
    </header>
  );

  const renderProfileEditor = () => (
      <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-stone-900 rounded-2xl border border-stone-700 shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-6 border-b border-stone-800 flex justify-between items-center">
                  <h3 className="text-xl font-serif text-white">Update Your Look</h3>
                  <button onClick={() => setIsProfileModalOpen(false)} className="text-stone-400 hover:text-white">&times;</button>
              </div>
              <div className="p-6">
                  <p className="text-stone-400 text-sm mb-6 text-center">Smile! This will be used as your chef profile picture.</p>
                  <WebcamCapture onCapture={handleUpdateAvatar} />
              </div>
              <div className="p-6 border-t border-stone-800 bg-stone-850 flex justify-end">
                  <Button variant="secondary" onClick={() => setIsProfileModalOpen(false)}>Cancel</Button>
              </div>
          </div>
      </div>
  );

  const renderHome = () => {
    // Calculate unique tags
    const allTags = Array.from(new Set(recipes.flatMap(r => r.tags || []))).sort();
    
    // Filter recipes based on selection
    const filteredRecipes = selectedTag 
        ? recipes.filter(r => r.tags?.includes(selectedTag))
        : recipes;

    return (
    <div className="animate-fade-in pb-20 pt-20">
      {/* Hero Section */}
      <div className="relative w-full h-[60vh] min-h-[500px] mb-12 flex items-center justify-center overflow-hidden bg-stone-900">
          <div className="absolute inset-0">
               {/* Susu Image */}
               <SafeImage 
                 src={SUSU_IMAGE_URL} 
                 className="w-full h-full object-cover object-center" 
                 alt="Susu cooking" 
               />
               <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent"></div>
               <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-transparent to-transparent"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col md:flex-row items-end md:items-center justify-between gap-12">
              <div className="md:w-1/2 space-y-6">
                  <h2 className="text-6xl md:text-8xl font-serif font-bold text-white leading-none shadow-black drop-shadow-2xl">
                    Susu's <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Kitchen</span>
                  </h2>
                  <p className="text-xl text-stone-300 font-light italic border-l-4 border-amber-500 pl-4 bg-black/20 backdrop-blur-sm pr-4 py-2 rounded-r-lg inline-block">
                    "The secret ingredient is always love. Come, let's cook together."
                  </p>
                  {currentUser.role === UserRole.ADMIN && (
                    <Button variant="gold" onClick={() => { setCreationStep('MEDIA'); setView('CREATE_RECIPE'); }} icon={<span className="text-xl">+</span>} className="mt-4 shadow-xl shadow-amber-900/20">
                        Create New Masterpiece
                    </Button>
                  )}
              </div>

              <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 md:w-auto w-full">
                  <h3 className="text-stone-300 text-xs uppercase tracking-widest mb-4 font-bold text-center">Who is cooking today?</h3>
                  <div className="flex justify-center space-x-4">
                      {users.map(u => (
                          <div 
                            key={u.id} 
                            onClick={() => setCurrentUser(u)}
                            className={`cursor-pointer transition-all duration-300 flex flex-col items-center space-y-2 group ${currentUser.id === u.id ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                          >
                              <div className={`w-14 h-14 rounded-full p-0.5 border-2 ${currentUser.id === u.id ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'border-stone-600 group-hover:border-stone-400'}`}>
                                  <SafeImage 
                                    src={u.avatar} 
                                    className="w-full h-full rounded-full object-cover" 
                                  />
                              </div>
                              <span className={`text-xs font-medium ${currentUser.id === u.id ? 'text-amber-500' : 'text-stone-300'}`}>{u.name.split(' ')[0]}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* Recipe Grid */}
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Header with Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-stone-800 pb-4 gap-4">
             <div>
                <h3 className="text-3xl font-serif text-stone-100">Family Masterpieces</h3>
                <div className="text-stone-500 text-sm mt-1">
                    {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'} 
                    {selectedTag && <span> in <span className="text-amber-500">{selectedTag}</span></span>}
                </div>
             </div>
             
             {/* Filter Tags */}
             <div className="flex overflow-x-auto pb-2 gap-2 max-w-full md:max-w-2xl">
                  <button
                    onClick={() => setSelectedTag(null)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${selectedTag === null ? 'bg-amber-500 border-amber-500 text-black' : 'bg-transparent border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'}`}
                  >
                    All
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${selectedTag === tag ? 'bg-amber-500 border-amber-500 text-black' : 'bg-transparent border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'}`}
                    >
                      {tag}
                    </button>
                  ))}
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRecipes.length === 0 ? (
                <div className="col-span-full py-20 text-center text-stone-500 bg-stone-900/50 rounded-xl border border-stone-800 border-dashed">
                    <p className="text-xl font-serif text-stone-400 mb-2">No recipes found for this category.</p>
                    <button onClick={() => setSelectedTag(null)} className="text-amber-500 hover:underline text-sm font-bold uppercase tracking-wide">View all recipes</button>
                </div>
            ) : (
                filteredRecipes.map(recipe => {
                const isFav = currentUser.favorites.includes(recipe.id);
                return (
                    <div 
                        key={recipe.id} 
                        onClick={() => { setSelectedRecipe(recipe); setServingsMultiplier(1); setView('RECIPE_DETAIL'); }}
                        className="group cursor-pointer bg-stone-900 rounded-2xl overflow-hidden border border-stone-800 hover:border-amber-500/50 shadow-lg hover:shadow-amber-900/10 transition-all duration-500 transform hover:-translate-y-2"
                    >
                        <div className="aspect-w-4 aspect-h-3 w-full h-64 overflow-hidden relative">
                            {recipe.imageUrl ? (
                                <SafeImage src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-600 bg-stone-800">No Image</div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent opacity-90 group-hover:opacity-60 transition-opacity"></div>
                            
                            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                                {recipe.videoUrl && <span className="bg-amber-500/90 backdrop-blur text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center"><span className="mr-1">▶</span> VIDEO</span>}
                                <span className={`text-[10px] font-bold px-2 py-1 rounded shadow-lg border border-white/10 backdrop-blur-md ${
                                    recipe.difficulty === 'Easy' ? 'bg-green-900/60 text-green-200' :
                                    recipe.difficulty === 'Medium' ? 'bg-yellow-900/60 text-yellow-200' : 'bg-red-900/60 text-red-200'
                                }`}>
                                    {recipe.difficulty?.toUpperCase() || 'MEDIUM'}
                                </span>
                            </div>

                            <button 
                                onClick={(e) => { e.stopPropagation(); const newFavs = isFav ? currentUser.favorites.filter(id => id !== recipe.id) : [...currentUser.favorites, recipe.id]; setCurrentUser({...currentUser, favorites: newFavs}); }}
                                className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-300 ${isFav ? 'bg-amber-500 text-black scale-110' : 'bg-black/30 text-white hover:bg-black/50'}`}
                            >
                                <svg className="h-5 w-5" fill={isFav ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            </button>
                        </div>
                        
                        <div className="p-6 relative">
                            <h3 className="text-2xl font-bold font-serif text-stone-100 group-hover:text-amber-500 transition-colors line-clamp-1 mb-2">{recipe.title}</h3>
                            <p className="text-stone-400 text-sm line-clamp-2 mb-4 leading-relaxed font-light">{recipe.description}</p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-stone-800/50">
                                <div className="flex items-center space-x-4 text-xs text-stone-500 font-medium tracking-wide">
                                    <span className="flex items-center"><span className="mr-1.5 text-amber-500">⏱</span> {recipe.prepTime}</span>
                                    {recipe.calories && <span className="flex items-center"><span className="mr-1.5 text-amber-500">🔥</span> {recipe.calories} kcal</span>}
                                </div>
                                <div className="flex items-center -space-x-2">
                                    <SafeImage 
                                        src={users.find(u => u.id === recipe.authorId)?.avatar} 
                                        className="w-8 h-8 rounded-full border-2 border-stone-800 object-cover" 
                                        title={users.find(u => u.id === recipe.authorId)?.name} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })
            )}
        </div>
      </div>
    </div>
    );
  };

  const renderCreate = () => (
    <div className="max-w-4xl mx-auto p-6 min-h-[85vh] pt-24 animate-fade-in">
         <div className="mb-8 flex items-center space-x-4">
            <button onClick={() => { setDraftRecipe(null); setView('HOME'); }} className="text-stone-400 hover:text-white transition-colors">&larr; Cancel</button>
            <h2 className="text-3xl font-serif text-stone-100">Add Susu's Recipe</h2>
        </div>

        {creationStep === 'MEDIA' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-stone-850 p-6 rounded-2xl border border-stone-700 shadow-xl">
                        <h3 className="text-xl font-medium text-stone-200 mb-4 flex items-center">
                            <span className="bg-amber-500 w-8 h-8 rounded-full text-black flex items-center justify-center mr-3 font-bold text-sm">1</span>
                            Take a Photo
                        </h3>
                        <p className="text-stone-400 text-sm mb-4">Show us the dish! This helps Susu understand the ingredients.</p>
                        <WebcamCapture 
                            onCapture={(img) => setCapturedImage(img)} 
                            onRetake={() => setCapturedImage(null)}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-stone-850 p-6 rounded-2xl border border-stone-700 shadow-xl h-full flex flex-col justify-between">
                        <div>
                            <h3 className="text-xl font-medium text-stone-200 mb-4 flex items-center">
                                <span className="bg-amber-500 w-8 h-8 rounded-full text-black flex items-center justify-center mr-3 font-bold text-sm">2</span>
                                Explain the Recipe
                            </h3>
                            <p className="text-stone-400 text-sm mb-6">"Start by chopping onions..." - Describe it naturally.</p>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center justify-center">
                             <AudioRecorder onRecordingComplete={handleGenerateRecipe} isProcessing={isGenerating} />
                        </div>
                        
                        {isGenerating && (
                            <div className="mt-8 text-center space-y-3">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                                <p className="text-amber-500 font-medium">Susu is writing it down...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            draftRecipe && (
                <div className="space-y-8 animate-fade-in">
                    {/* Simplified Review UI for brevity, keeping existing structure */}
                    <div className="flex justify-between items-center bg-stone-850 p-4 rounded-xl border border-stone-800 sticky top-24 z-40 shadow-xl">
                        <h3 className="text-xl font-bold text-white">Review Draft</h3>
                        <div className="flex space-x-3">
                            <Button variant="secondary" onClick={() => { setCreationStep('MEDIA'); setDraftRecipe(null); }}>Discard</Button>
                            <Button variant="gold" onClick={handleSaveRecipe}>Save Recipe</Button>
                        </div>
                    </div>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="bg-stone-900 rounded-xl overflow-hidden border border-stone-800 aspect-video relative">
                                <SafeImage src={draftRecipe.imageUrl} className="w-full h-full object-cover" />
                                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded text-xs text-white">AI Generated Preview</div>
                            </div>
                            {!draftRecipe.videoUrl && (
                                <Button className="w-full" variant="secondary" onClick={handleGenerateVideo} isLoading={isGenerating}>Generate Cinematic Video</Button>
                            )}
                            {draftRecipe.videoUrl && (
                                <video src={draftRecipe.videoUrl} controls className="w-full rounded-xl border border-stone-800" />
                            )}
                        </div>
                        <div className="bg-stone-850 p-6 rounded-xl border border-stone-800 space-y-4">
                            <input value={draftRecipe.title} onChange={(e) => setDraftRecipe({...draftRecipe, title: e.target.value})} className="w-full bg-transparent text-2xl font-serif font-bold border-b border-stone-700 pb-2 focus:border-amber-500 outline-none" placeholder="Recipe Title" />
                            <textarea value={draftRecipe.description} onChange={(e) => setDraftRecipe({...draftRecipe, description: e.target.value})} className="w-full bg-stone-900 p-3 rounded text-sm text-stone-300 h-24" />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-stone-900 p-3 rounded">
                                    <p className="text-xs text-stone-500 uppercase">Difficulty</p>
                                    <select 
                                        value={draftRecipe.difficulty || 'Medium'} 
                                        onChange={(e) => setDraftRecipe({...draftRecipe, difficulty: e.target.value as any})}
                                        className="bg-transparent text-white w-full"
                                    >
                                        <option>Easy</option>
                                        <option>Medium</option>
                                        <option>Hard</option>
                                    </select>
                                </div>
                                <div className="bg-stone-900 p-3 rounded">
                                     <p className="text-xs text-stone-500 uppercase">Calories</p>
                                     <input type="number" value={draftRecipe.calories || 0} onChange={(e) => setDraftRecipe({...draftRecipe, calories: parseInt(e.target.value)})} className="bg-transparent text-white w-full" />
                                </div>
                            </div>
                        </div>
                     </div>
                </div>
            )
        )}
    </div>
  );

  const renderDetail = () => {
    if (!selectedRecipe) return null;

    return (
      <div className="pt-24 pb-20 max-w-6xl mx-auto px-6 animate-fade-in">
        <button 
            onClick={() => setView('HOME')} 
            className="mb-6 text-stone-400 hover:text-white flex items-center transition-colors group"
        >
          <span className="mr-2 transform group-hover:-translate-x-1 transition-transform">←</span> Back to Kitchen
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column: Visuals & Actions */}
            <div className="space-y-8">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-stone-800 aspect-[4/3] group">
                    <SafeImage 
                      src={selectedRecipe.imageUrl} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      alt={selectedRecipe.title} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent opacity-60"></div>
                    
                    <div className="absolute top-4 right-4 z-10">
                         <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const isFav = currentUser.favorites.includes(selectedRecipe.id);
                                const newFavs = isFav ? currentUser.favorites.filter(id => id !== selectedRecipe.id) : [...currentUser.favorites, selectedRecipe.id];
                                setCurrentUser({...currentUser, favorites: newFavs});
                            }}
                            className={`p-3 rounded-full backdrop-blur-md transition-all duration-300 shadow-xl ${currentUser.favorites.includes(selectedRecipe.id) ? 'bg-amber-500 text-black scale-110' : 'bg-black/40 text-white hover:bg-black/60'}`}
                        >
                            <svg className="h-6 w-6" fill={currentUser.favorites.includes(selectedRecipe.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                {/* Video Section */}
                 <div className="bg-stone-900/50 rounded-xl p-1 border border-stone-800">
                    {selectedRecipe.videoUrl ? (
                         <div className="relative aspect-video rounded-lg overflow-hidden group">
                             <video src={selectedRecipe.videoUrl} controls className="w-full h-full object-cover" />
                         </div>
                    ) : (
                        <div className="p-8 text-center space-y-4">
                            <div className="w-12 h-12 bg-stone-800 rounded-full flex items-center justify-center mx-auto text-stone-500">
                                <span className="text-2xl">🎥</span>
                            </div>
                            <div>
                                <h4 className="text-stone-300 font-medium">Watch the Magic</h4>
                                <p className="text-stone-500 text-sm mt-1 mb-4">Generate a cinematic video preview of this dish.</p>
                                <Button variant="secondary" onClick={handleGenerateVideoForActiveRecipe} isLoading={isGenerating}>
                                    Generate Video
                                </Button>
                            </div>
                        </div>
                    )}
                 </div>

                {/* Ask Susu Box */}
                <div className="bg-stone-850 rounded-2xl p-6 border border-stone-800 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 opacity-5 pointer-events-none">
                         <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-1.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" /></svg>
                    </div>
                    <div className="flex items-center space-x-3 mb-4 relative z-10">
                        <SafeImage src={users.find(u => u.id === 'susu')?.avatar} className="w-10 h-10 rounded-full border border-stone-600" alt="Susu" />
                        <div>
                             <h3 className="text-lg font-serif text-amber-500 leading-none">Ask Susu</h3>
                             <p className="text-xs text-stone-400">Expert advice & motherly love</p>
                        </div>
                    </div>
                    
                    <form onSubmit={handleAskSusu} className="relative z-10 space-y-4">
                        <div className="flex space-x-2">
                            <input 
                                value={askSusuQuery}
                                onChange={(e) => setAskSusuQuery(e.target.value)}
                                placeholder="Stuck on a step? Need a substitute?"
                                className="flex-1 bg-stone-950/80 border border-stone-700 rounded-lg px-4 py-3 text-sm focus:border-amber-500 outline-none transition-colors placeholder-stone-600"
                            />
                            <Button variant="primary" type="submit" disabled={!askSusuQuery || isAskingSusu} className="px-4">
                                {isAskingSusu ? '...' : 'Ask'}
                            </Button>
                        </div>
                    </form>

                    {susuResponse && (
                        <div className="mt-4 p-4 bg-stone-900/90 rounded-xl border border-stone-700 animate-fade-in relative z-10">
                            <p className="text-stone-300 text-sm italic mb-3 leading-relaxed">"{susuResponse.text}"</p>
                            {susuResponse.sources && susuResponse.sources.length > 0 && (
                                <div className="text-[10px] text-stone-500 pt-3 border-t border-stone-800 flex flex-wrap gap-2">
                                    <span className="font-bold">Sources:</span>
                                    {susuResponse.sources.map((s: any, i: number) => (
                                        <a key={i} href={s.web?.uri || s.uri} target="_blank" rel="noreferrer" className="hover:text-amber-500 underline truncate max-w-[150px]">
                                            {s.web?.title || s.title || 'Link'}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Recipe Content */}
            <div className="space-y-10">
                <div className="border-b border-stone-800 pb-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {selectedRecipe.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 rounded-full bg-stone-800 text-stone-400 text-xs font-bold uppercase tracking-wider border border-stone-700">{tag}</span>
                        ))}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-100 mb-6 leading-tight">{selectedRecipe.title}</h1>
                    <p className="text-lg text-stone-300 leading-relaxed font-light">{selectedRecipe.description}</p>
                    
                    <div className="grid grid-cols-3 gap-4 mt-8">
                        <div className="bg-stone-900 rounded-lg p-4 text-center border border-stone-800">
                             <div className="text-amber-500 text-xl mb-1">⏱</div>
                             <div className="text-xs text-stone-500 uppercase tracking-wide">Prep Time</div>
                             <div className="font-bold text-stone-200">{selectedRecipe.prepTime}</div>
                        </div>
                        <div className="bg-stone-900 rounded-lg p-4 text-center border border-stone-800">
                             <div className="text-amber-500 text-xl mb-1">🍽️</div>
                             <div className="text-xs text-stone-500 uppercase tracking-wide">Servings</div>
                             <div className="font-bold text-stone-200">{selectedRecipe.servings}</div>
                        </div>
                        <div className="bg-stone-900 rounded-lg p-4 text-center border border-stone-800">
                             <div className="text-amber-500 text-xl mb-1">🔥</div>
                             <div className="text-xs text-stone-500 uppercase tracking-wide">Calories</div>
                             <div className="font-bold text-stone-200">{selectedRecipe.calories || '---'}</div>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-end mb-6">
                        <h3 className="text-2xl font-serif text-stone-200">Ingredients</h3>
                        <div className="flex items-center space-x-2 bg-stone-900 rounded-lg p-1 border border-stone-800">
                            <button 
                                onClick={() => setServingsMultiplier(Math.max(0.5, servingsMultiplier - 0.5))} 
                                className="w-8 h-8 flex items-center justify-center hover:bg-stone-800 rounded text-stone-400 transition-colors"
                            >-</button>
                            <span className="text-sm font-bold w-12 text-center text-amber-500">{servingsMultiplier}x</span>
                            <button 
                                onClick={() => setServingsMultiplier(servingsMultiplier + 0.5)} 
                                className="w-8 h-8 flex items-center justify-center hover:bg-stone-800 rounded text-stone-400 transition-colors"
                            >+</button>
                        </div>
                    </div>
                    
                    <ul className="space-y-0 divider-y divide-stone-800/50">
                        {selectedRecipe.ingredients.map(ing => (
                            <li key={ing.id} className="py-3 flex items-start justify-between group border-b border-stone-800/30 last:border-0">
                                <div className="flex items-start">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 mr-4 mt-2"></div>
                                    <span className="text-stone-300">
                                        <span className="font-bold text-stone-100 mr-1.5 text-lg">
                                            {/* Logic not perfect but sufficient for demo */}
                                            {/* If amount starts with number, try to scale, otherwise just show. 
                                                For robustness we'd use a library like 'fraction.js' but here we keep it simple. */}
                                            {ing.amount} {servingsMultiplier !== 1 && <span className="text-amber-500 text-xs ml-1">(x{servingsMultiplier})</span>}
                                        </span> 
                                        {ing.item}
                                    </span>
                                </div>
                                <span className="text-xs text-stone-600 font-mono group-hover:text-stone-400 transition-colors pt-1">
                                    ${(ing.estimatedCost * servingsMultiplier).toFixed(2)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    
                    <div className="mt-6">
                        <Button 
                            variant="secondary" 
                            className="w-full text-sm border-dashed border-stone-700 text-stone-400 hover:text-amber-500 hover:border-amber-500"
                            onClick={() => addToShoppingList(selectedRecipe.ingredients)}
                        >
                            + Add All to Shopping List
                        </Button>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-6">
                         <h3 className="text-2xl font-serif text-stone-200">Instructions</h3>
                         {!selectedRecipe.instructionThumbnails && (
                             <Button 
                                variant="secondary" 
                                className="text-xs py-1.5 px-3 border-amber-900 text-amber-500 hover:bg-amber-900/20"
                                onClick={handleVisualizeSteps}
                                isLoading={isGenerating}
                                icon={<span>✨</span>}
                             >
                                 Visualize Steps
                             </Button>
                         )}
                    </div>

                    <div className="space-y-8 relative pl-2">
                        {/* Connecting Line */}
                        <div className="absolute left-[19px] top-4 bottom-8 w-0.5 bg-stone-800"></div>
                        
                        {selectedRecipe.instructions.map((step, idx) => (
                            <div key={idx} className="relative pl-12 group">
                                <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-stone-900 border-2 border-stone-800 group-hover:border-amber-500 transition-colors text-stone-500 group-hover:text-amber-500 font-bold text-sm flex items-center justify-center z-10 shadow-xl">
                                    {idx + 1}
                                </div>
                                <div className="pt-1">
                                    <p className="text-stone-300 leading-relaxed text-lg mb-2 group-hover:text-stone-100 transition-colors">{step}</p>
                                    
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="inline-flex items-center px-2 py-1 rounded bg-stone-900 text-stone-500 text-xs uppercase tracking-wider font-bold">
                                            <span className="mr-2 text-base">{getStepActionIcon(step)}</span> Action
                                        </div>

                                        {/* Render AI generated thumbnail if available */}
                                        {selectedRecipe.instructionThumbnails && selectedRecipe.instructionThumbnails[idx] && (
                                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-stone-700 shadow-md animate-fade-in">
                                                <img 
                                                    src={selectedRecipe.instructionThumbnails[idx]} 
                                                    alt={`Step ${idx + 1} visual`} 
                                                    className="w-full h-full object-cover transform hover:scale-150 transition-transform duration-500 cursor-pointer" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-amber-900/10 to-transparent border border-amber-900/30 p-8 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 text-amber-500/10 transform translate-x-1/3 -translate-y-1/3">
                         <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    </div>
                    <h4 className="text-amber-500 font-serif font-bold mb-3 flex items-center text-xl relative z-10">
                        <span className="text-2xl mr-3">🤫</span> Susu's Secret Tip
                    </h4>
                    <p className="text-stone-300 italic text-lg leading-relaxed relative z-10">"{selectedRecipe.tips}"</p>
                </div>
                
                <div className="sticky bottom-6 z-40 pt-4">
                     <Button 
                        variant="gold" 
                        className="w-full shadow-2xl shadow-amber-900/20 text-lg py-5 transform hover:translate-y-[-2px] transition-transform"
                        onClick={() => {
                            setCurrentStepIndex(0);
                            setView('COOKING_MODE');
                        }}
                     >
                        Start Cooking Mode 👨‍🍳
                     </Button>
                </div>
            </div>
        </div>
      </div>
    );
  };

  const renderCookingMode = () => {
    if (!selectedRecipe) return null;
    const currentStep = selectedRecipe.instructions[currentStepIndex];

    return (
        <div className="fixed inset-0 z-[60] bg-stone-950 flex flex-col animate-fade-in">
            <div className="p-6 flex justify-between items-center border-b border-stone-800">
                <h2 className="text-xl font-serif text-stone-400">Step {currentStepIndex + 1} of {selectedRecipe.instructions.length}</h2>
                <button onClick={() => { setView('RECIPE_DETAIL'); setCurrentStepIndex(0); }} className="text-stone-400 hover:text-white">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto">
                {selectedRecipe.instructionThumbnails && selectedRecipe.instructionThumbnails[currentStepIndex] && (
                    <div className="mb-8 rounded-2xl overflow-hidden shadow-2xl border border-stone-800 w-48 h-48 mx-auto">
                        <img 
                            src={selectedRecipe.instructionThumbnails[currentStepIndex]} 
                            className="w-full h-full object-cover" 
                            alt="Visual Step"
                        />
                    </div>
                )}
                
                <p className="text-3xl md:text-5xl font-serif text-stone-100 leading-tight mb-12">{currentStep}</p>
                
                <div className="flex gap-8">
                     <button 
                        onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                        disabled={currentStepIndex === 0}
                        className="p-6 rounded-full bg-stone-800 text-stone-400 disabled:opacity-30 hover:bg-amber-500 hover:text-black transition"
                     >
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                     </button>

                     <button 
                        onClick={() => speak(currentStep)}
                        className="p-6 rounded-full bg-stone-800 text-amber-500 hover:bg-amber-500 hover:text-black transition"
                     >
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                     </button>

                     <button 
                        onClick={() => setCurrentStepIndex(Math.min(selectedRecipe.instructions.length - 1, currentStepIndex + 1))}
                        disabled={currentStepIndex === selectedRecipe.instructions.length - 1}
                        className="p-6 rounded-full bg-stone-800 text-stone-400 disabled:opacity-30 hover:bg-amber-500 hover:text-black transition"
                     >
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                     </button>
                </div>
            </div>

            <div className="p-6 border-t border-stone-800 bg-stone-900/50 text-center">
                <p className="text-stone-500 text-sm">Tap speaker for voice instructions</p>
            </div>
        </div>
    );
  };

  const renderShoppingList = () => (
    <div className="pt-24 px-6 max-w-4xl mx-auto animate-fade-in">
        <h2 className="text-3xl font-serif text-stone-100 mb-8">Shopping List</h2>
        
        {currentUser.shoppingList.length === 0 ? (
            <div className="bg-stone-900 rounded-xl p-12 text-center border border-stone-800">
                <div className="text-4xl mb-4">🛒</div>
                <h3 className="text-xl font-bold text-stone-300 mb-2">Your list is empty</h3>
                <p className="text-stone-500 mb-6">Looks like you have everything you need for Susu's recipes!</p>
                <Button variant="gold" onClick={() => setView('HOME')}>Browse Recipes</Button>
            </div>
        ) : (
            <div className="bg-stone-900 rounded-xl overflow-hidden border border-stone-800 shadow-xl">
                 <div className="p-6 space-y-4">
                    {currentUser.shoppingList.map(item => (
                        <div key={item.id} className="flex items-center space-x-4 border-b border-stone-800 pb-4 last:border-0 last:pb-0 group">
                            <input 
                                type="checkbox" 
                                checked={item.checked} 
                                onChange={() => {
                                    const newList = currentUser.shoppingList.map(i => i.id === item.id ? {...i, checked: !i.checked} : i);
                                    setCurrentUser({...currentUser, shoppingList: newList});
                                }} 
                                className="w-6 h-6 rounded border-stone-600 text-amber-500 focus:ring-amber-500 bg-transparent cursor-pointer" 
                            />
                            <div className={`flex-1 transition-colors ${item.checked ? "line-through text-stone-600" : "text-stone-200"}`}>
                                <span className="font-bold text-amber-500">{item.amount}</span> {item.item}
                            </div>
                            <button 
                                onClick={() => {
                                    const newList = currentUser.shoppingList.filter(i => i.id !== item.id);
                                    setCurrentUser({...currentUser, shoppingList: newList});
                                }}
                                className="text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove item"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ))}
                 </div>
                 <div className="bg-stone-850 p-4 border-t border-stone-800 flex justify-between items-center">
                    <span className="text-sm text-stone-500">{currentUser.shoppingList.filter(i => i.checked).length} of {currentUser.shoppingList.length} items checked</span>
                    <Button variant="secondary" onClick={() => setCurrentUser({...currentUser, shoppingList: []})} className="text-xs py-2 px-3">
                        Clear All
                    </Button>
                 </div>
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-amber-500 selection:text-black">
      {renderHeader()}
      {isProfileModalOpen && renderProfileEditor()}
      
      <main>
        {view === 'HOME' && renderHome()}
        {view === 'RECIPE_DETAIL' && renderDetail()}
        {view === 'CREATE_RECIPE' && renderCreate()}
        {view === 'COOKING_MODE' && renderCookingMode()}
        {view === 'SHOPPING_LIST' && renderShoppingList()}
      </main>
    </div>
  );
};

export default App;
