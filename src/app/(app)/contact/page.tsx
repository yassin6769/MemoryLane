
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, ExternalLink, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const contactDetails = {
    phone: "01129355324",
    email: "mhdhanishaziq76799106@gmail.com",
    location: "KM 22, Jalan Matang, Petra Jaya, 93050 Kuching, Sarawak",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=KM+22,+Jalan+Matang,+Petra+Jaya,+93050+Kuching,+Sarawak"
  };

  const handleDial = () => {
    window.location.href = `tel:${contactDetails.phone}`;
  };

  const handleEmail = () => {
    window.location.href = `mailto:${contactDetails.email}`;
  };

  const handleMap = () => {
    window.open(contactDetails.mapsUrl, "_blank");
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold font-headline">Contact Us</h1>
        <p className="text-muted-foreground italic">We're here to help you preserve your most precious memories.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-muted/60 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Get in Touch
            </CardTitle>
            <CardDescription>Reach out to us through any of these channels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-muted/30">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Phone className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Phone</p>
                <p className="text-lg font-headline">{contactDetails.phone}</p>
                <Button variant="outline" size="sm" className="mt-2 w-full gap-2" onClick={handleDial}>
                  <Phone className="h-3.5 w-3.5" /> Call Now
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-muted/30">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm break-all">{contactDetails.email}</p>
                <Button variant="outline" size="sm" className="mt-2 w-full gap-2" onClick={handleEmail}>
                  <Mail className="h-3.5 w-3.5" /> Send Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/60 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Our Location
            </CardTitle>
            <CardDescription>Visit us or send us mail at our Sarawak office.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-muted/30">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">Headquarters</p>
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  {contactDetails.location}
                </p>
                <Button variant="default" className="mt-2 w-full gap-2" onClick={handleMap}>
                  <ExternalLink className="h-3.5 w-3.5" /> Open in Maps
                </Button>
              </div>
            </div>
            
            <div className="relative h-48 w-full rounded-xl overflow-hidden border border-muted/50">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15953.5855026605!2d110.2885444!3d1.545811!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31fba255375e2f7b%3A0x8898b31a5a73a670!2sMatang%2C%20Sarawak!5e0!3m2!1sen!2smy!4v1710000000000!5m2!1sen!2smy" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
