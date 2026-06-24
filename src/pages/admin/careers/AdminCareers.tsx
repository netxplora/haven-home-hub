import { useState } from "react";
// trigger re-eval
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Settings, Users, Star, LayoutList } from "lucide-react";
import { CareersSettingsTab } from "./CareersSettingsTab";
import { CareersJobsTab } from "./CareersJobsTab";
import { CareersBenefitsTab } from "./CareersBenefitsTab";
import { CareersApplicantsTab } from "./CareersApplicantsTab";

export function AdminCareers() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Careers Management</h2>
        <p className="text-muted-foreground">
          Manage your company's career page, job postings, benefits, and applications.
        </p>
      </div>

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="bg-muted/50 w-full justify-start h-auto p-1 flex-wrap gap-1">
          <TabsTrigger value="jobs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Briefcase className="h-4 w-4" /> Open Positions
          </TabsTrigger>
          <TabsTrigger value="applicants" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Users className="h-4 w-4" /> Applicants
          </TabsTrigger>
          <TabsTrigger value="benefits" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Star className="h-4 w-4" /> Benefits & Culture
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Settings className="h-4 w-4" /> Page Settings & SEO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4 outline-none">
          <CareersJobsTab />
        </TabsContent>

        <TabsContent value="applicants" className="space-y-4 outline-none">
          <CareersApplicantsTab />
        </TabsContent>

        <TabsContent value="benefits" className="space-y-4 outline-none">
          <CareersBenefitsTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 outline-none">
          <CareersSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
