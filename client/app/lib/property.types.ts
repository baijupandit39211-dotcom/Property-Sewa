export type Property = {
  _id: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  images: { url: string }[];
};
