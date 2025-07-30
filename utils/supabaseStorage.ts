import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oweimywvzmqoizsyotrt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Trade Images Functions
 */

// Upload a trade image to the trade-images bucket
export const uploadTradeImage = async (tradeId: string, file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${tradeId}-${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('trade-images')
    .upload(fileName, file, {
      upsert: false,
      cacheControl: '3600'
    });
    
  if (error) throw error;
  
  // Return the data along with the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('trade-images')
    .getPublicUrl(fileName);
    
  return { ...data, publicUrl };
};

// Get public URL for a trade image
export const getTradeImageUrl = (filePath: string) => {
  return supabase.storage
    .from('trade-images')
    .getPublicUrl(filePath)
    .data.publicUrl;
};

// Delete a trade image
export const deleteTradeImage = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('trade-images')
    .remove([filePath]);
    
  if (error) throw error;
  
  return { success: true };
};

// List all trade images for a specific trade
export const listTradeImages = async (tradeId: string) => {
  const { data, error } = await supabase.storage
    .from('trade-images')
    .list(undefined, {
      search: tradeId
    });
    
  if (error) throw error;
  
  return data;
};

/**
 * Setup Images Functions
 */

// Upload a setup image to the setup-images bucket
export const uploadSetupImage = async (setupId: string, file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${setupId}-${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('setup-images')
    .upload(fileName, file, {
      upsert: false,
      cacheControl: '3600'
    });
    
  if (error) throw error;
  
  // Return the data along with the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('setup-images')
    .getPublicUrl(fileName);
    
  return { ...data, publicUrl };
};

// Get public URL for a setup image
export const getSetupImageUrl = (filePath: string) => {
  return supabase.storage
    .from('setup-images')
    .getPublicUrl(filePath)
    .data.publicUrl;
};

// Delete a setup image
export const deleteSetupImage = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('setup-images')
    .remove([filePath]);
    
  if (error) throw error;
  
  return { success: true };
};

// List all setup images for a specific setup
export const listSetupImages = async (setupId: string) => {
  const { data, error } = await supabase.storage
    .from('setup-images')
    .list(undefined, {
      search: setupId
    });
    
  if (error) throw error;
  
  return data;
};

/**
 * Shared Assets Functions
 */

// Upload a shared asset to the shared-assets bucket
export const uploadSharedAsset = async (folder: string, file: File) => {
  const filePath = `${folder}/${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('shared-assets')
    .upload(filePath, file, {
      upsert: true,
      cacheControl: '3600'
    });
    
  if (error) throw error;
  
  // Return the data along with the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('shared-assets')
    .getPublicUrl(filePath);
    
  return { ...data, publicUrl };
};

// Get public URL for a shared asset
export const getSharedAssetUrl = (filePath: string) => {
  return supabase.storage
    .from('shared-assets')
    .getPublicUrl(filePath)
    .data.publicUrl;
};

// Delete a shared asset
export const deleteSharedAsset = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('shared-assets')
    .remove([filePath]);
    
  if (error) throw error;
  
  return { success: true };
};

// List all shared assets in a specific folder
export const listSharedAssets = async (folder: string = '') => {
  const { data, error } = await supabase.storage
    .from('shared-assets')
    .list(folder);
    
  if (error) throw error;
  
  return data;
};
