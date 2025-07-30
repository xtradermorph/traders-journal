import { supabase } from './index'

/**
 * Trade Images Functions
 */

// Upload a trade image to the trade-images bucket
export const uploadTradeImage = async (tradeId: string, file: File) => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${tradeId}-${Date.now()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('trade-images')
      .upload(fileName, file, {
        upsert: false,
        cacheControl: '3600'
      })
      
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('trade-images')
      .getPublicUrl(fileName)
      
    return { ...data, publicUrl }
  } catch (error) {
    console.error('Error uploading trade image:', error)
    throw error
  }
}

// Get public URL for a trade image
export const getTradeImageUrl = (filePath: string) => {
  try {
    return supabase.storage
      .from('trade-images')
      .getPublicUrl(filePath)
      .data.publicUrl
  } catch (error) {
    console.error('Error getting trade image URL:', error)
    throw error
  }
}

// Delete a trade image
export const deleteTradeImage = async (filePath: string) => {
  try {
    const { error } = await supabase.storage
      .from('trade-images')
      .remove([filePath])
      
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting trade image:', error)
    throw error
  }
}

// List all trade images for a specific trade
export const listTradeImages = async (tradeId: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('trade-images')
      .list(undefined, {
        search: tradeId
      })
      
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error listing trade images:', error)
    throw error
  }
}

/**
 * Setup Images Functions
 */

// Upload a setup image to the setup-images bucket
export const uploadSetupImage = async (setupId: string, file: File) => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${setupId}-${Date.now()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('setup-images')
      .upload(fileName, file, {
        upsert: false,
        cacheControl: '3600'
      })
      
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('setup-images')
      .getPublicUrl(fileName)
      
    return { ...data, publicUrl }
  } catch (error) {
    console.error('Error uploading setup image:', error)
    throw error
  }
}

// Get public URL for a setup image
export const getSetupImageUrl = (filePath: string) => {
  try {
    return supabase.storage
      .from('setup-images')
      .getPublicUrl(filePath)
      .data.publicUrl
  } catch (error) {
    console.error('Error getting setup image URL:', error)
    throw error
  }
}

// Delete a setup image
export const deleteSetupImage = async (filePath: string) => {
  try {
    const { error } = await supabase.storage
      .from('setup-images')
      .remove([filePath])
      
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting setup image:', error)
    throw error
  }
}

// List all setup images for a specific setup
export const listSetupImages = async (setupId: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('setup-images')
      .list(undefined, {
        search: setupId
      })
      
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error listing setup images:', error)
    throw error
  }
}

/**
 * Shared Assets Functions
 */

// Upload a shared asset to the shared-assets bucket
export const uploadSharedAsset = async (folder: string, file: File) => {
  try {
    const filePath = `${folder}/${file.name}`
    
    const { data, error } = await supabase.storage
      .from('shared-assets')
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600'
      })
      
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('shared-assets')
      .getPublicUrl(filePath)
      
    return { ...data, publicUrl }
  } catch (error) {
    console.error('Error uploading shared asset:', error)
    throw error
  }
}

// Get public URL for a shared asset
export const getSharedAssetUrl = (filePath: string) => {
  try {
    return supabase.storage
      .from('shared-assets')
      .getPublicUrl(filePath)
      .data.publicUrl
  } catch (error) {
    console.error('Error getting shared asset URL:', error)
    throw error
  }
}

// Delete a shared asset
export const deleteSharedAsset = async (filePath: string) => {
  try {
    const { error } = await supabase.storage
      .from('shared-assets')
      .remove([filePath])
      
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting shared asset:', error)
    throw error
  }
}

// List all shared assets in a folder
export const listSharedAssets = async (folder: string = '') => {
  try {
    const { data, error } = await supabase.storage
      .from('shared-assets')
      .list(folder)
      
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error listing shared assets:', error)
    throw error
  }
} 