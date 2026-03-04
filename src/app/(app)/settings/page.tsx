import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold font-headline mb-8">Settings</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Manage your personal information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Profile settings will be available here soon.</p>
                </CardContent>
            </Card>
        </div>
    );
}
