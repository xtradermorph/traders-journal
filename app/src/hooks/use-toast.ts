import { useToast as useToastOriginal } from '@/components/ui/use-toast'

export interface Toast {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export const useToast = () => {
  const { toast } = useToastOriginal()
  
  return {
    toast: (props: {
      id?: string;
      title: string;
      description?: string;
      variant?: 'default' | 'destructive';
    }) => {
      toast({
        ...props,
        duration: 5000
      })
    }
  }
}