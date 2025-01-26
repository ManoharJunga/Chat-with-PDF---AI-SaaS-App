import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BrainCog,
  Eye,
  Globe,
  MonitorSmartphone,
  ServerCog,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const features = [
  {
    name: "Store PDF Documents",
    description: "Securely store and access your PDFs anytime, anywhere.",
    icon: Globe,
  },
  {
    name: "Blazing Fast Responses",
    description: "Get instant answers to your queries with our lightning-fast AI.",
    icon: Zap,
  },
  {
    name: "Chat Memorization",
    description: "Our AI remembers context for a personalized chat experience.",
    icon: BrainCog,
  },
  {
    name: "Interactive PDF Viewer",
    description: "Engage with your PDFs using our intuitive interactive viewer.",
    icon: Eye,
  },
  {
    name: "Cloud Backup",
    description: "Your documents are safely backed up and protected in the cloud.",
    icon: ServerCog,
  },
  {
    name: "Cross-Device Compatibility",
    description: "Seamlessly use on desktop, tablet, or smartphone.",
    icon: MonitorSmartphone,
  },
];

const faqs = [
  {
    question: "How does Chat with PDF work?",
    answer:
      "Chat with PDF uses advanced AI to analyze your uploaded PDFs. You can then ask questions about the content, and our AI will provide relevant answers based on the document's information.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes, we take data security very seriously. All uploaded documents are encrypted and stored securely. We do not share your data with third parties.",
  },
  {
    question: "Can I use Chat with PDF on my mobile device?",
    answer:
      "Yes! Chat with PDF is fully responsive and works seamlessly on desktops, tablets, and smartphones.",
  },
];

const FeatureCard = ({ name, description, Icon }) => (
  <Card className="border-purple-100 hover:border-purple-200 transition-colors duration-300">
    <CardHeader>
      <Icon className="h-8 w-8 text-purple-600" />
      <CardTitle className="mt-4 text-lg font-medium text-gray-900">{name}</CardTitle>
    </CardHeader>
    <CardContent>
      <CardDescription className="mt-2 text-base text-gray-500">{description}</CardDescription>
    </CardContent>
  </Card>
);

const FAQItem = ({ question, answer }) => (
  <Accordion type="single" collapsible className="w-full">
    <AccordionItem value={question}>
      <AccordionTrigger className="text-left">{question}</AccordionTrigger>
      <AccordionContent>{answer}</AccordionContent>
    </AccordionItem>
  </Accordion>
);

export default function Home() {
  return (
    <main className="relative flex-1 overflow-scroll p-2 lg:p-5 bg-gradient-to-bl from-white to-indigo-600">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-50 to-amber-50 py-20 sm:py-32 relative">
        <div className="absolute top-4 right-4 z-20 flex gap-4">
          <Button variant="outline" className="rounded-full">
            <Link href="/sign-in">Log in</Link>
          </Button>
          <Button className="rounded-full">
            <Link href="/sign-in">Sign up</Link>
          </Button>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:mx-auto md:max-w-2xl lg:col-span-6 lg:text-left">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block text-purple-600 xl:inline">FileFox</span>{" "}
                <span className="block xl:inline">Your Interactive Document Companion</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                Transform static PDFs into dynamic conversations. Upload, chat, and extract insights effortlessly.
              </p>
              <div className="mt-8 sm:mt-12">
                <Button size="lg" className="rounded-full">
                  <Link href="/sign-in">Get Started</Link>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="relative mt-12 sm:mx-auto sm:max-w-lg lg:col-span-6 lg:mx-0 lg:mt-0 lg:flex lg:max-w-none lg:items-center">
              <div className="relative mx-auto w-full rounded-lg shadow-lg lg:max-w-md">
                <Image
                  className="w-full rounded-lg"
                  src="https://i.imgur.com/VciRSTI.jpeg"
                  alt="Chat with PDF interface"
                  width={800}
                  height={600}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="sm:text-center">
            <h2 className="text-base font-semibold uppercase tracking-wide text-purple-600">Features</h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to master your PDFs
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-500">
              Unlock the full potential of your documents with our comprehensive suite of features.
            </p>
          </div>
          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ name, description, icon: Icon }) => (
              <FeatureCard key={name} name={name} description={description} Icon={Icon} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl divide-y divide-gray-900/10">
            <h2 className="text-2xl font-bold leading-10 tracking-tight text-gray-900">Frequently asked questions</h2>
            <dl className="mt-10 space-y-6 divide-y divide-gray-900/10">
              {faqs.map(({ question, answer }) => (
                <FAQItem key={question} question={question} answer={answer} />
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Floating CTA */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button size="lg" className="rounded-full shadow-lg">
          <Link href="/sign-in">Try for Free</Link>
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </main>
  );
}
