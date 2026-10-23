// Projects shown on the network home. Edit this list to add or change entries.
export type NetworkProject = {
  id: string;
  name: string;
  name_ne: string | null;
  description: string;
  description_ne: string | null;
  tags: string[];
  status: "live" | "in_development";
  href?: string; // Optional link to the live project
};

export const NETWORK_PROJECTS: NetworkProject[] = [
  {
    id: "my-store",
    name: "My Store",
    name_ne: "माई स्टोर",
    description:
      "A full online store for one shop: product catalog with images, cart and four-step checkout, order tracking, customer accounts, and an admin dashboard for orders, products, coupons, delivery zones and reports.",
    description_ne:
      "एउटा पसलको लागि पूर्ण अनलाइन स्टोर: तस्बिरसहित उत्पादन सूची, कार्ट र चार चरणको चेकआउट, अर्डर ट्र्याकिङ, ग्राहक खाता, र अर्डर, उत्पादन, कुपन, डेलिभरी क्षेत्र तथा रिपोर्टका लागि एडमिन ड्यासबोर्ड।",
    tags: ["React", "TypeScript", "Supabase", "English & Nepali"],
    status: "in_development",
    href: "/",
  },
];
