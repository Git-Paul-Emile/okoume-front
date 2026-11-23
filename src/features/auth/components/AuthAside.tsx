import { motion } from 'motion/react';
import { Heart, Package } from 'lucide-react';

export function AuthAside() {
  const perks = [
    { icon: Package, text: 'Historique et suivi de toutes vos commandes' },
    { icon: Heart, text: 'Favoris et adresses enregistrés' },
  ];
  return (
    <div className="hidden flex-col justify-center rounded-xl bg-forest p-10 text-white lg:flex">
      <h2 className="text-2xl text-white">Un compte, c’est facultatif.</h2>
      <p className="mt-2 text-white/80">
        Vous pouvez commander sans compte. Avec un compte, vous profitez en plus de :
      </p>
      <ul className="mt-6 space-y-4">
        {perks.map(({ icon: Icon, text }, i) => (
          <motion.li
            key={text}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
            className="flex items-center gap-3"
          >
            <span className="grid size-10 place-items-center">
              <Icon className="size-5" />
            </span>
            {text}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
