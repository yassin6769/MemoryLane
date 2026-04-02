
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFirestore, useUser } from "@/firebase";
import { doc, updateDoc, serverTimestamp, getDocs, collection, query, where, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInYears } from "date-fns";

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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, User, CalendarIcon, Users, AtSign, Hash, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters."),
  username: z.string()
    .min(3, "Username must be at least 3 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  dateOfBirth: z.date({
    required_error: "A date of birth is required.",
  }),
  gender: z.enum(["Male", "Female", "Other"]),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm({ profile }: { profile: any }) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const dobDate = profile?.dateOfBirth instanceof Timestamp 
    ? profile.dateOfBirth.toDate() 
    : profile?.dateOfBirth ? new Date(profile.dateOfBirth) : undefined;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.displayName || "",
      username: profile?.username || "",
      dateOfBirth: dobDate,
      gender: profile?.gender || "Other",
    },
  });

  const selectedDob = form.watch("dateOfBirth");
  const calculatedAge = selectedDob ? differenceInYears(new Date(), selectedDob) : null;

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;
    setIsLoading(true);

    try {
      // 1. Check Username Uniqueness (if changed)
      if (values.username !== profile?.username) {
        const q = query(collection(db, "users"), where("username", "==", values.username));
        const querySnapshot = await getDocs(q);
        
        // Ensure the matching document isn't just the current user (sanity check)
        const isTaken = querySnapshot.docs.some(doc => doc.id !== user.uid);
        
        if (isTaken) {
          form.setError("username", { message: "This username is already taken. Please try another." });
          setIsLoading(false);
          return;
        }
      }

      // 2. Update Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: values.displayName,
        username: values.username.toLowerCase(), // Store lowercase for easier searching
        dateOfBirth: Timestamp.fromDate(values.dateOfBirth),
        age: calculatedAge, // Keep for legacy or quick display
        updatedAt: serverTimestamp(),
      });

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
          Update your public profile and handle.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
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
                This is your immutable system identifier. It cannot be changed.
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
                      <Input placeholder="jane_doe_99" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your unique handle used by collaborators.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2 mb-1">
                      <CalendarIcon className="h-4 w-4" /> Date of Birth
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {calculatedAge !== null && (
                      <FormDescription className="mt-1 text-primary font-medium">
                        Calculated Age: {calculatedAge} years old
                      </FormDescription>
                    )}
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
                        defaultValue={field.value}
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
