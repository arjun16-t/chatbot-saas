import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import LandingHeader from '../components/landing/LandingHeader.jsx'
import Hero from '../components/landing/Hero.jsx'
import TickerDivider from '../components/landing/TickerDivider.jsx'
import DataTrackDivider from '../components/landing/DataTrackDivider.jsx'
import PipelineSimulation from '../components/landing/PipelineSimulation.jsx'
import BentoGrid from '../components/landing/BentoGrid.jsx'
import CtaSection from '../components/landing/CtaSection.jsx'
import BrandMarquee from '../components/landing/BrandMarquee.jsx'
import LandingFooter from '../components/landing/LandingFooter.jsx'
import '../styles/landing.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Public landing page ("/"). Reimplements home.js's ScrollReveal
 * module as a mount-time effect targeting the same .reveal /
 * .reveal-stagger classes the original static site used -- markup
 * didn't need to change, just how it's wired up.
 *
 * PipelineSimulation owns its own GSAP ScrollTrigger setup/cleanup
 * independently (see that component) -- nothing pipeline-specific
 * lives here.
 */
function HomePage() {
  useEffect(() => {
    const revealAnims = gsap.utils.toArray('.reveal').map((el) =>
      gsap.fromTo(
        el,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    )

    const staggerAnims = gsap.utils.toArray('.reveal-stagger').map((group) =>
      gsap.fromTo(
        group.children,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.12,
          scrollTrigger: {
            trigger: group,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    )

    return () => {
      revealAnims.forEach((tween) => tween.scrollTrigger?.kill())
      staggerAnims.forEach((tween) => tween.scrollTrigger?.kill())
    }
  }, [])

  return (
    <>
      <LandingHeader />

      <main>
        <Hero />
        <TickerDivider />
        <DataTrackDivider />
        <PipelineSimulation />
        <DataTrackDivider />
        <BentoGrid />
        <DataTrackDivider />
        <CtaSection />
        <BrandMarquee />
        <LandingFooter />
      </main>
    </>
  )
}

export default HomePage