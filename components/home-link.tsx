import Link from "next/link";
import Image from "next/image";

export default function HomeLink() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <Image 
        src="/phenom-white-optimized.webp" 
        alt="Phenomitor Logo" 
        width={70} 
        height={70} 
      />
      <span className="text-xl font-bold">Phenomitor</span>
    </Link>
  );
}
