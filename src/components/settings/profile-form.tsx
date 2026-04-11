
"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFirestore, useUser, useStorage } from "@/firebase";
import { doc, updateDoc, serverTimestamp, getDocs, collection, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Users, AtSign, Hash, Check, Camera } from "lucide-react";

const profileSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters."),
  username: z.string()
    .min(3, "Username must be at least 3 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  age: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
    message: "Please enter a valid age (number).",
  }),
  gender: z.enum(["Male", "Female", "Other"]),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm({ profile }: { profile: any }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      username: "",
      age: "",
      gender: "Other",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        displayName: profile.displayName || "",
        username: profile.username || "",
        age: profile.age?.toString() || "",
        gender: profile.gender || "Other",
      });
    }
  }, [profile, form]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Basic size check (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 2MB.",
      });
      return;
    }

    setIsImageUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${user.uid}/avatar`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Auth Profile
      await updateProfile(user, { photoURL: downloadURL });

      // Update Firestore Profile
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        profileImageUrl: downloadURL,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Profile Picture Updated",
        description: "Your new avatar has been saved.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload your profile picture. Please try again.",
      });
    } finally {
      setIsImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;
    setIsLoading(true);

    try {
      const normalizedUsername = values.username.toLowerCase();

      if (normalizedUsername !== profile?.username) {
        const q = query(
          collection(db, "users"), 
          where("username", "==", normalizedUsername)
        );
        const querySnapshot = await getDocs(q);
        const isTaken = querySnapshot.docs.some(doc => doc.id !== user.uid);
        
        if (isTaken) {
          form.setError("username", { message: "This username is already taken." });
          setIsLoading(false);
          return;
        }
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: values.displayName,
        username: normalizedUsername,
        age: values.age ? Number(values.age) : null,
        gender: values.gender,
        updatedAt: serverTimestamp(),
      });

      // Also update auth profile display name
      await updateProfile(user, { displayName: values.displayName });

      toast({
        title: "Profile Updated",
        description: "Your information has been saved successfully.",
      });
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "An error occurred while saving your profile.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Update your public profile and unique handle.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-2 border-primary/20">
                  <AvatarImage src={user?.photoURL || ""} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {user?.displayName?.charAt(0) || <User className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                {isImageUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  disabled={isImageUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isImageUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                  Change Photo
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageChange}
                />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">JPG, PNG or GIF (Max 2MB)</p>
              </div>
            </div>

            {/* Read-Only UID Display */}
            <FormItem className="bg-muted/30 p-4 rounded-lg border border-dashed">
              <FormLabel className="flex items-center gap-2 text-muted-foreground">
                <Hash className="h-4 w-4" /> Account ID (UID)
              </FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                   <Input 
                    value={user?.uid || ""} 
                    readOnly 
                    className="bg-transparent border-none p-0 h-auto font-mono text-xs text-muted-foreground select-all focus-visible:ring-0" 
                  />
                  <Check className="h-3 w-3 text-green-500" />
                </div>
              </FormControl>
              <FormDescription className="text-[10px]">
                This is your system identifier and cannot be changed.
              </FormDescription>
            </FormItem>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Full Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <AtSign className="h-4 w-4" /> Username
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="jane_doe" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your unique social handle.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Age
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="25" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="flex items-center gap-2">
                       <Users className="h-4 w-4" /> Gender
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Male" />
                          </FormControl>
                          <FormLabel className="font-normal">Male</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Female" />
                          </FormControl>
                          <FormLabel className="font-normal">Female</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Other" />
                          </FormControl>
                          <FormLabel className="font-normal">Other</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
