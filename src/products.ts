import { Product } from './types';

export const STORE_PRODUCTS: Product[] = [
  {
    id: 'aetheris-core-pro-v4',
    name: 'Aetheris Core Pro V4',
    price: 245.99,
    description: 'The world\'s first quantum-accelerated neural development harness. Specially synthesized for low-latency diagnostic simulators, high-density telemetry processing, and microservice validation loops. Includes an integrated liquid helium cooler module.',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=60',
    category: 'Hardware Systems',
    specs: {
      'Processing Core': '128 Qubit Edge TPU',
      'Cooling Pipeline': 'Liquid Helium Ring',
      'Bandwidth Range': '1.2 Tbps Synaptic',
      'API Framework': 'REST & gRPC native'
    },
    stock: 3
  },
  {
    id: 'cyberpunk-synth-keycap',
    name: 'NeonSynth Artisan Keycap',
    price: 49.99,
    description: 'A hand-crafted mechanical keycap featuring cast brass and translucent resin matrix layers. Perfect for terminal injection consoles and debug sessions under low ambient light.',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=60',
    category: 'Peripherals',
    specs: {
      'Stem Profile': 'Cherry MX / Gateron',
      'Material': 'Brass & Epoxy Resin',
      'Luminescence': 'Trisulfide Glow Core',
      'Form Factor': '1u standard escape'
    },
    stock: 14
  },
  {
    id: 'holographic-projection-hub',
    name: 'OmniProjection Holo-Hub',
    price: 389.00,
    description: 'A table-top holographic display hub capable of casting high-density real-time 3D telemetry trees and database schemas directly into mid-air.',
    imageUrl: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=600&auto=format&fit=crop&q=60',
    category: 'Displays',
    specs: {
      'Resolution': '8K Volumetric Pixels',
      'Refresh Rate': '144Hz Beam Interlace',
      'Sensor Link': 'LiDAR Spatial Tracking',
      'Connectivity': 'OptiLink Fiber Hub'
    },
    stock: 5
  },
  {
    id: 'diagnostics-analyzer-harness',
    name: 'Spectral Bus Analyzer Harness',
    price: 189.50,
    description: 'Hardware probe harness designed to hook directly into server motherboard bus pipelines to capture raw instruction frames before log serialization occurs.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=60',
    category: 'Diagnostic Tools',
    specs: {
      'Probe Lines': '16-channel gold contact',
      'Input Range': 'Direct PCI-E gen5 lines',
      'Sampling Rate': '5.0 GSps logic analyzer',
      'Isolation': 'Optogalvanic up to 5KV'
    },
    stock: 8
  },
  {
    id: 'aether-shield-dongle',
    name: 'Cryptographic Aether Shield',
    price: 75.00,
    description: 'A solid titanium security key offering physical-layer OAuth handshakes, HSM partition sandboxing, and autonomous private-key token rotation.',
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=60',
    category: 'Security Systems',
    specs: {
      'Encryption': 'Post-Quantum CRYSTALS-Dilithium',
      'Body Material': 'Grade-5 Aerospace Titanium',
      'Protocols': 'FIDO2 / WebAuthn / U2F',
      'Interface': 'Dual USB-C & NFC Core'
    },
    stock: 22
  },
  {
    id: 'helium-coolant-refill',
    name: 'Liquid Helium Recirculation Pack',
    price: 120.00,
    description: 'A pressurised high-purity replacement liquid helium tank designed for Aetheris CPU cooling rings. Keeps qubits stabilized at 0.015 Kelvin.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60',
    category: 'Hardware Systems',
    specs: {
      'Purity Level': '99.9999% Ultra-Dry',
      'Volume': '2.5 Liters Compressed',
      'Fitting Type': 'Self-Sealing CryoLock V2',
      'Safety Standard': 'ISO-9001 Pressurized Cell'
    },
    stock: 9
  }
];
