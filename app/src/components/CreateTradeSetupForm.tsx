"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, Upload, Loader2, Check } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Form schema
const tradeSetupSchema = z.object({
  title: z.string()
    .min(5, "Title must be at least 5 characters")
    .max(50, "Title must be 50 characters or less"),
  description: z.string()
    .min(20, "Description must be at least 20 characters")
    .max(300, "Description must be 300 characters or less"),
  pair: z.string()
    .min(3, "Currency pair is required and must be at least 3 characters"),
  entry_price: z.string()
    .min(1, "Entry price is required")
    .max(10, "Entry price must be 10 characters or less")
    .refine(
      (val) => /^[0-9.]+$/.test(val) && parseFloat(val) > 0,
      { message: "Entry price must be a positive number" }
    ),
  stop_loss: z.string()
    .min(1, "Stop loss is required")
    .max(10, "Stop loss must be 10 characters or less")
    .refine(
      (val) => /^[0-9.]+$/.test(val) && parseFloat(val) > 0,
      { message: "Stop loss must be a positive number" }
    ),
  target_price: z.string()
    .min(1, "Target price is required")
    .max(10, "Target price must be 10 characters or less")
    .refine(
      (val) => /^[0-9.]+$/.test(val) && parseFloat(val) > 0,
      { message: "Target price must be a positive number" }
    ),
  direction: z.enum(["LONG", "SHORT"], {
    required_error: "Trade direction is required",
  }),
  timeframe: z.string().min(1, "Timeframe is required"),
  is_public: z.boolean().default(true),
  forum_ids: z.array(z.string()).min(1, "Please select one forum to share your trade setup"),
}).refine(
  (data) => {
    // If the setup is public, currency pair is required
    if (data.is_public) {
      return data.pair && data.pair.length >= 3;
    }
    // If private, currency pair is optional
    return true;
  },
  {
    message: "Currency pair is required for public trade setups",
    path: ["pair"],
  }
);

type TradeSetupFormValues = z.infer<typeof tradeSetupSchema>;

const timeframeOptions = [
  { value: "1m", label: "1 Minute" },
  { value: "3m", label: "3 Minutes" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "30m", label: "30 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "Daily" },
  { value: "1w", label: "Weekly" },
  { value: "1M", label: "Monthly" },
];

const commonPairs = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", 
  "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP", 
  "EUR/JPY", "GBP/JPY", "AUD/JPY", "EUR/AUD"
];

const forumOptions = [
  { id: "gbp_usd", name: "GBP/USD" },
  { id: "eur_usd", name: "EUR/USD" },
  { id: "usd_jpy", name: "USD/JPY" },
  { id: "other", name: "Other Pairs" }
];

const CreateTradeSetupForm = () => {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<TradeSetupFormValues>({
    resolver: zodResolver(tradeSetupSchema),
    defaultValues: {
      title: "",
      description: "",
      pair: "",
      entry_price: "",
      stop_loss: "",
      target_price: "",
      direction: "LONG",
      timeframe: "",
      is_public: true as boolean,
      forum_ids: [],
    },
  });

  const handleTagAdd = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      if (tagInput.trim().length <= 10) {
        setTags([...tags, tagInput.trim()]);
        setTagInput("");
      } else {
        toast({
          title: "Tag Too Long",
          description: "Tags must be 10 characters or less.",
          variant: "destructive"
        });
      }
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Validate file count
      if (selectedImages.length + files.length > 5) {
        toast({
          title: "Too Many Images",
          description: `You can upload a maximum of 5 images. You currently have ${selectedImages.length} images.`,
          variant: "destructive"
        });
        return;
      }
      
      // Validate file types and sizes
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/heic'];
      const maxSize = 3 * 1024 * 1024; // 3MB
      
      const validFiles = files.filter(file => {
        if (!validTypes.includes(file.type)) {
          toast({
            title: "Invalid File Type",
            description: `${file.name} is not a supported image type. Please use PNG, JPG, JPEG, or HEIC.`,
            variant: "destructive"
          });
          return false;
        }
        
        if (file.size > maxSize) {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than 3MB. Please choose a smaller file.`,
            variant: "destructive"
          });
          return false;
        }
        
        return true;
      });
      
      if (validFiles.length === 0) return;
      
      setSelectedImages(prev => [...prev, ...validFiles]);
      
      // Create previews
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
      
      // Show success message for valid files
      if (validFiles.length > 0) {
        toast({
          title: "Images Added",
          description: `Added ${validFiles.length} image(s). ${selectedImages.length + validFiles.length}/5 images selected.`,
        });
      }
      
      // Clear the input to allow selecting the same file again
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  // Navigation is now handled at the page level through the PageHeader component

  const onSubmit: SubmitHandler<TradeSetupFormValues> = async (data) => {
    setIsSubmitting(true);
    setShowSuccessMessage(false);
    
    try {
      // Validate that at least 1 chart image is uploaded
      if (selectedImages.length === 0) {
        toast({
          title: "Chart Image Required",
          description: "Please upload at least 1 chart image to share your trade setup.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Convert string values to numbers for calculation
      const entryPrice = parseFloat(data.entry_price);
      const stopLoss = parseFloat(data.stop_loss);
      const targetPrice = parseFloat(data.target_price);
      
      // Calculate risk-reward ratio
      const riskRewardRatio = Math.abs((targetPrice - entryPrice) / (entryPrice - stopLoss));
      
      // Check if stop loss is too close to entry price (would create extreme risk-reward ratio)
      const priceDifference = Math.abs(entryPrice - stopLoss);
      if (priceDifference < 0.01) {
        toast({
          title: 'Invalid Setup',
          description: 'Stop loss is too close to entry price. Please increase the distance between entry and stop loss.',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }
      
      // Limit risk-reward ratio to fit within database constraint (numeric(5,2) = max 999.99)
      const limitedRiskRewardRatio = Math.min(riskRewardRatio, 999.99);
      
      // Warn user if the ratio was limited
      if (riskRewardRatio > 999.99) {
        console.warn('Risk-reward ratio was limited from', riskRewardRatio, 'to', limitedRiskRewardRatio);
        toast({
          title: 'Warning',
          description: 'Risk-reward ratio was adjusted to fit database constraints. Consider adjusting your stop loss or target price.',
          variant: 'default'
        });
      }

      // Upload the images to Supabase Storage
      const imageUrls = [];
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData || !userData.user) {
          throw new Error('User not authenticated');
        }
        
        const userId = userData.user.id;
        // Upload each image to Supabase storage
        for (let i = 0; i < selectedImages.length; i++) {
          const { data: uploadData, error } = await supabase.storage
            .from('setup-images')
            .upload(`${userId}/${Date.now()}-${selectedImages[i].name}`, selectedImages[i]);
          
          if (error) {
            console.error(`Error uploading image ${i + 1}:`, error);
            toast({
              title: "Upload Error",
              description: `Failed to upload image ${i + 1}. Please try again.`,
              variant: "destructive"
            });
            setIsSubmitting(false);
            return;
          }
          
          // Get the public URL for the uploaded image
          const { data } = supabase.storage
            .from('setup-images')
            .getPublicUrl(uploadData?.path ?? '');
          
          imageUrls.push(data.publicUrl);
        }
      } catch (imageError) {
        console.error("Error uploading images:", imageError);
        toast({
          title: "Upload Error",
          description: "Failed to upload images. Please try again.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Determine primary forum_id based on the pair
      const primaryForumId = data.pair.replace('/', '_').toLowerCase();
      
      // Use selected forums or default to the primary forum based on pair
      const forumIds = data.forum_ids.length > 0 ? 
        data.forum_ids : 
        [primaryForumId];

      // Prepare trade setup data
      const setupData = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        title: data.title,
        description: data.description,
        currency_pair: data.pair,
        direction: data.direction,
        entry_price: entryPrice,
        stop_loss: stopLoss,
        target_price: targetPrice,
        timeframe: data.timeframe,
        is_public: data.is_public,
        image_urls: imageUrls,
        forum_id: primaryForumId,
        forum_ids: forumIds,
        risk_reward_ratio: limitedRiskRewardRatio
      };
      
      console.log('Attempting to insert trade setup with data:', setupData);
      
      // Insert into trade_setups table
      const { data: createdSetup, error: setupError } = await supabase
        .from('trade_setups')
        .insert(setupData)
        .select()
        .single();

      if (setupError) {
        console.error('Error inserting trade setup:', setupError);
        toast({
          title: 'Database Error',
          description: `Failed to save trade setup: ${setupError.message}`,
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      console.log('Trade setup created successfully:', createdSetup);

      // 2. If setup insertion is successful and there are tags, insert them
      if (createdSetup && tags.length > 0) {
        const tradeSetupId = createdSetup.id;
        const tagsToInsert = tags.map(tag => ({
          setup_id: tradeSetupId,
          tag: tag
        }));
        const { error: tagsError } = await supabase
          .from('trade_setup_tags')
          .insert(tagsToInsert);

        if (tagsError) {
          console.error('Error inserting tags:', tagsError);
          // Non-critical error, so we can still proceed but notify the user
          toast({
            title: 'Tagging Error',
            description: 'Trade setup created, but failed to save tags.',
            variant: 'destructive'
          });
        }
      }

      setShowSuccessMessage(true);
      setSuccessMessage(data.is_public 
        ? "Your trade setup has been successfully shared with the community." 
        : "Your private trade setup has been successfully saved.");
      
      // Reset success message after 2 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 2000);
      
      // Navigate after a short delay to the appropriate forum
      setTimeout(() => {
        if (data.is_public && data.forum_ids.length > 0) {
          // For public setups, redirect to the specific forum that was selected
          const selectedForumId = data.forum_ids[0];
          
          // Use query parameters instead of path parameters
          const forumPath = `/social-forum?tab=community&forum=${selectedForumId}`;
          
          router.push(forumPath);
        } else {
          // For private setups (Public Visibility off), redirect to My Setups page
          router.push("/social-forum?tab=my-setups");
        }
      }, 1500);

    } catch (error) {
      console.error("Error creating trade setup:", error);
      toast({
        id: "trade-setup-error",
        title: "Error",
        description: "Failed to create trade setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Create Trade Setup</CardTitle>
        <CardDescription>
          Share your trade setup with the community. Include all relevant details to help others understand your analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="E.g., EUR/USD Bullish Breakout Setup" 
                      maxLength={50}
                      {...field} 
                    />
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormDescription>
                      A clear, concise title for your trade setup.
                    </FormDescription>
                    {(field.value?.length || 0) >= 45 && (
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/50
                      </span>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your analysis, entry conditions, and rationale..." 
                      className="min-h-32"
                      maxLength={300}
                      {...field} 
                    />
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormDescription>
                      Provide a detailed explanation of your trade setup and analysis.
                    </FormDescription>
                    {(field.value?.length || 0) >= 270 && (
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/300
                      </span>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="pair"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency Pair *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a currency pair" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonPairs.map((pair) => (
                        <SelectItem key={pair} value={pair}>
                          {pair}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the currency pair for your trade setup.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeframe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeframe *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a timeframe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeframeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The timeframe of your chart analysis.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="entry_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Price *</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="1.0865" 
                        inputMode="decimal"
                        maxLength={10}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        onKeyPress={(e) => {
                          // Allow only numbers and dots
                          const char = String.fromCharCode(e.which);
                          if (!/[0-9.]/.test(char)) {
                            e.preventDefault();
                          }
                          // Prevent multiple dots
                          if (char === '.' && field.value?.includes('.')) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          // Only allow numbers and dots, max 10 characters
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          if (value.length <= 10) {
                            field.onChange(value);
                          }
                        }}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormMessage />
                      {(field.value || '').length >= 8 && (
                        <span className="text-xs text-muted-foreground">
                          {(field.value || '').length}/10
                        </span>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stop_loss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stop Loss *</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="1.0830" 
                        inputMode="decimal"
                        maxLength={10}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        onKeyPress={(e) => {
                          // Allow only numbers and dots
                          const char = String.fromCharCode(e.which);
                          if (!/[0-9.]/.test(char)) {
                            e.preventDefault();
                          }
                          // Prevent multiple dots
                          if (char === '.' && field.value?.includes('.')) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          // Only allow numbers and dots, max 10 characters
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          if (value.length <= 10) {
                            field.onChange(value);
                          }
                        }}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormMessage />
                      {(field.value || '').length >= 8 && (
                        <span className="text-xs text-muted-foreground">
                          {(field.value || '').length}/10
                        </span>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Price *</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="1.0935" 
                        inputMode="decimal"
                        maxLength={10}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        onKeyPress={(e) => {
                          // Allow only numbers and dots
                          const char = String.fromCharCode(e.which);
                          if (!/[0-9.]/.test(char)) {
                            e.preventDefault();
                          }
                          // Prevent multiple dots
                          if (char === '.' && field.value?.includes('.')) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          // Only allow numbers and dots, max 10 characters
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          if (value.length <= 10) {
                            field.onChange(value);
                          }
                        }}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormMessage />
                      {(field.value || '').length >= 8 && (
                        <span className="text-xs text-muted-foreground">
                          {(field.value || '').length}/10
                        </span>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormLabel>Tags (optional, max 5)</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleTagRemove(tag)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 10) {
                      setTagInput(value);
                    }
                  }}
                  placeholder="Add a tag (e.g., breakout, trend)"
                  maxLength={10}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTagAdd();
                    }
                  }}
                  disabled={tags.length >= 5}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleTagAdd}
                  disabled={tags.length >= 5 || !tagInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <FormDescription>
                  Add up to 5 tags to help categorize your trade setup (optional).
                </FormDescription>
                {tagInput.length >= 8 && (
                  <span className="text-xs text-muted-foreground">
                    {tagInput.length}/10
                  </span>
                )}
              </div>
            </div>

            <div>
              <FormLabel>Chart Images * (minimum 1, max 5)</FormLabel>
              {selectedImages.length === 0 ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Input
                    type="file"
                    accept="image/png,image/jpg,image/jpeg,image/heic"
                    onChange={handleImageChange}
                    className="hidden"
                    id="chart-images"
                    multiple
                  />
                  <label htmlFor="chart-images" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-muted-foreground">Click to upload chart images</span>
                    <span className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG, HEIC (max 3MB each, minimum 1 image required)</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {selectedImages.length}/5 images selected
                    </span>
                    {selectedImages.length < 5 && (
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                        <Input
                          type="file"
                          accept="image/png,image/jpg,image/jpeg,image/heic"
                          onChange={handleImageChange}
                          className="hidden"
                          id="add-more-images"
                          multiple
                        />
                        <label htmlFor="add-more-images" className="cursor-pointer flex flex-col items-center">
                          <Plus className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Add more images</span>
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <Image 
                          src={preview} 
                          alt={`Chart preview ${index + 1}`} 
                          width={200}
                          height={320}
                          className="max-h-80 rounded-lg mx-auto object-contain"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <FormDescription className="mt-2">
                Upload at least 1 chart image to illustrate your trade setup. Maximum 5 images allowed.
              </FormDescription>
            </div>

            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trade Direction *</FormLabel>
                  <FormControl>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="LONG"
                          value="LONG"
                          checked={field.value === "LONG"}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-4 w-4 border-primary text-primary focus:ring-primary"
                        />
                        <label htmlFor="LONG" className="text-sm font-medium">Long</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="SHORT"
                          value="SHORT"
                          checked={field.value === "SHORT"}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-4 w-4 border-primary text-primary focus:ring-primary"
                        />
                        <label htmlFor="SHORT" className="text-sm font-medium">Short</label>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_public"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Public Visibility</FormLabel>
                    <FormDescription>
                      {field.value 
                        ? "Your trade setup will be visible to all community members in the selected currency pair forum." 
                        : "Your trade setup will only be visible to you in 'My Trade Setups'."}
                    </FormDescription>
                    {field.value && !form.watch('pair') && (
                      <p className="text-xs text-destructive mt-1">
                        Note: Public trade setups require selecting a currency pair.
                      </p>
                    )}
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        // If switching to private, we don't need to clear the pair
                        // as it's still useful information even for private setups
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('is_public') && (
              <FormField
                control={form.control}
                name="forum_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Share to Forums *</FormLabel>
                    <FormDescription>
                      Select one forum to share your trade setup with the community.
                    </FormDescription>
                    <FormControl>
                      <RadioGroup
                        value={field.value?.[0] || ""}
                        onValueChange={(value) => {
                          field.onChange([value]);
                        }}
                      >
                        <div className="space-y-3">
                          {forumOptions.map((forum) => (
                            <div key={forum.id} className="flex items-center space-x-2">
                              <RadioGroupItem value={forum.id} id={forum.id} />
                              <Label htmlFor={forum.id} className="font-normal">
                                {forum.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || showSuccessMessage}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sharing Trade Setup...
                </>
              ) : showSuccessMessage ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {successMessage}
                </>
              ) : (
                "Share Trade Setup"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={() => router.push("/social-forum")}>
          Cancel
        </Button>
        <div className="text-xs text-muted-foreground">
          By sharing, you agree to our community guidelines.
        </div>
      </CardFooter>
    </Card>
  );
};

export default CreateTradeSetupForm;
