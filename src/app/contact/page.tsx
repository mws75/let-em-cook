"use client"
import {useState, useEffect} from "react";
import {useUser} from "@clerk/nextjs";
import {useRouter} from "next/navigation";
import toast from "react-hot-toast";
import CookingTips from "@/components/CookingTips";

export default function Contact(){
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {user, isLoaded} = useUser();
  const router = useRouter();
  useEffect(() => {
    if(isLoaded && user) {
      setEmail(user.emailAddresses[0]?.emailAddress || "");
      setName(user.fullName || user.firstName || "");
    }
  }, [isLoaded, user])

  const handleCancelClick = () => {
    router.push("/dashboard");
  }

  const handleSubmitClick = async () => {
    setIsSubmitting(true);
    try{
     const response = await fetch("/api/contact", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({name, email, message}),
     });

     if(!response.ok) {
      const data = await response.json();
      toast.error(data.error || "Failed to send message");
      return;
     }
      toast.success("Message sent successfully");
      router.push("/dashboard");
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };
  return(
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-5">
        <div className="flex justify-center mt-10 mb-10">
          <h1 className="text-2xl md:text-4xl text-text font-bold">
          Fill out the Form to Contact Support
          </h1>
        </div>
        <section className="border-2 border-border rounded-3xl px-4 sm:px-10 py-4 bg-surface shadow-lg flex flex-col gap-4">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-2 py-2 border-2 border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"/>
        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-2 py-2 border-2 border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"/>
        </section>
        <section className="border-2 border-border rounded-3xl p-2 bg-surface shadow-lg">
          <h2 className="text-text text-xl font-bold ml-10">Message</h2>
          <textarea
            id="contact_support_message"
                        className="mx-4 sm:mx-5 block min-h-48 sm:min-h-64 w-full sm:w-9/12 rounded-lg border-2 border-border bg-surface p-2.5 text-sm text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
            placeholder="message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </section>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleSubmitClick}
            disabled={isSubmitting}
            className="w-full sm:w-1/3 px-6 py-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
          <button
            onClick={handleCancelClick}
            className="px-6 w-full sm:w-1/3 py-2 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
      <CookingTips isVisible={isSubmitting} />
    </div>
  );
}
