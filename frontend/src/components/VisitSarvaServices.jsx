import React from 'react';
import { motion } from 'framer-motion';
import { Home, FileCheck, FileSearch2, FileSignature, Palette, Hammer, Truck } from 'lucide-react';

// Reusable Service Card
const ServiceCard = ({ title, Icon, imgUrl, subOptions = [] }) => {
  const handleClick = (sub) => {
    const name = sub ? `${title} – ${sub}` : title;
    alert(`More details about ${name} will be available soon.`);
  };
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
      }}
      className="card p-6 flex flex-col cursor-pointer transition-transform hover:scale-[1.02] bg-white/95 dark:bg-slate-900/90 border border-white/15 rounded-xl shadow-lg overflow-hidden"
      onClick={() => !subOptions.length && handleClick()}
    >
      {imgUrl && (
        <div className="relative mb-4 h-40 w-full rounded-lg overflow-hidden">
          <img src={imgUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}
      <div className="w-12 h-12 rounded-lg bg-vs-gold/10 text-vs-gold flex items-center justify-center mb-4">
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <h3 className="font-display font-medium text-vs-text-primary text-lg mb-2">{title}</h3>
      {subOptions.length > 0 && (
        <div className="mt-4 space-y-2">
          {subOptions.map((opt) => (
            <button
              key={opt}
              className="w-full text-left px-3 py-2 rounded bg-vs-gold/10 hover:bg-vs-gold/20 text-sm"
              onClick={(e) => { e.stopPropagation(); handleClick(opt); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// Services Section component
const VisitSarvaServices = () => {
  const services = [
    { title: 'Interior Designing', Icon: Home, imgUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600' },
    {
      title: 'Khata Services',
      Icon: FileCheck,
      imgUrl: 'https://images.unsplash.com/photo-1519205482928-7c49caf0c9df?w=600',
      subOptions: ['E-Khata', 'B to A Khata', 'Mutation / Khata Transfer', 'E-Khata Corrections'],
    },
    { title: 'Encumbrance Certificate', Icon: FileSearch2, imgUrl: 'https://images.unsplash.com/photo-1593279003741-95ca73e482dd?w=600' },
    { title: 'Certified Sale Deed Copy', Icon: FileSignature, imgUrl: 'https://images.unsplash.com/photo-1604079621134-2761c040e02e?w=600' },
    { title: 'Painting Services', Icon: Palette, imgUrl: 'https://images.unsplash.com/photo-1580910051079-b93bb802b564?w=600' },
    { title: 'Renovation / Alteration Services', Icon: Hammer, imgUrl: 'https://images.unsplash.com/photo-1531081109619-1ac4281f42b6?w=600' },
    { title: 'Packers and Movers', Icon: Truck, imgUrl: 'https://images.unsplash.com/photo-1588091850440-259c4b31da97?w=600' },
  ];

  return (
    <section id="our-services" className="py-24 md:py-28 bg-vs-bg" data-testid="our-services-section">
      <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="max-w-2xl mb-10">
          <motion.div variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }} className="eyebrow text-vs-gold mb-4">Our Services</motion.div>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }} className="font-display text-3xl md:text-4xl font-medium text-vs-text-primary">
            Everything you need for your property, all in one place.
          </motion.h2>
        </motion.div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((svc) => (
            <ServiceCard key={svc.title} title={svc.title} Icon={svc.Icon} imgUrl={svc.imgUrl} subOptions={svc.subOptions} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default VisitSarvaServices;
