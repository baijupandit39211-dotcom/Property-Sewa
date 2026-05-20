"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import type { Property } from "@/app/lib/property.types";
import PropertyCard from "@/components/property/PropertyCard";

export default function ComparePropertyPanel({
  property,
  saved,
  messageHref,
  onSave,
  onRemove,
}: {
  property: Property;
  saved: boolean;
  messageHref: string;
  onSave: () => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="h-full"
    >
      <PropertyCard
        property={property}
        variant="default"
        saved={saved}
        onToggleWishlist={() => onSave()}
        onRemove={() => onRemove()}
        secondaryAction={{
          href: messageHref,
          label: "Contact Seller",
          icon: <MessageCircle className="h-4 w-4" />,
        }}
        viewLabel="View Listing"
      />
    </motion.div>
  );
}
