// src/app/dashboard/buildings/new/page.tsx
'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Save,
  Building2,
  MapPin,
  Home,
  X,
  Check,
  AlertCircle,
  Upload,
  Layers,
  Phone,
  Clock,
  Info,
  Plus,
  Trash2,
  Camera,
  ChevronDown,
  ChevronUp,
  Copy,
  Users,
  Calendar,
  Shield,
  DoorOpen,
  Bath,
  Bed,
  Maximize,
  Grid,
  Award,
  User,
  CalendarDays,
  ParkingCircle,
  ChevronRight,
  ChevronLeft,
  Compass,
  Sunrise,
  Sunset,
  Navigation,
  ArrowUp,
  ArrowDown,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight,
  Wind,
  Sun,
  Moon,
  Star,
  Sparkles,
  Zap,
  Paintbrush,
  Ruler,
  Weight,
  Scale,
  Gauge,
  Hash,
  Type,
  Text,
  FileText,
  Image,
  Video,
  Link as LinkIcon,
  Github,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Mail,
  PhoneCall,
  MessageCircle,
  MessageSquare,
  Send,
  Share,
  Heart,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh,
  Laugh,
  Angry,
  MoreHorizontal,
  MoreVertical,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload as UploadIcon,
  Printer,
  Trash,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Key,
  CreditCard,
  Wallet,
  DollarSign,
  Euro,
  PoundSterling,
  Bitcoin,
  Percent,
  BadgeCheck,
  BadgeX,
  BadgeAlert,
  BadgeInfo,
  BadgePlus,
  BadgeMinus,
  BadgeDollarSign,
  BadgeEuro,
  BadgePoundSterling,
  BadgePercent,
  Tag,
  Sofa,
  UtensilsCrossed
} from 'lucide-react'

interface Unit {
  unitNumber: string
  floor: number
  type: 'apartment' | 'studio' | 'duplex' | 'penthouse'
  area: number
  rooms: number
  bathrooms: number
  livingRooms: number
  kitchens: number
  maidRoom: boolean
  driverRoom: boolean
  acType: 'split' | 'window' | 'splitWindow' | 'central' | 'none'
  status: 'available' | 'sold' | 'reserved'
  price: number
  description?: string
}

interface Floor {
  number: number
  units: Unit[]
  floorPlan: '4shuqq' | '3shuqq' | '2shuqq' | 'custom'
  unitsPerFloor: number
}

interface OwnerAssociation {
  hasAssociation: boolean
  startDate?: string
  endDate?: string
  monthlyFee?: number
  contactNumber?: string
  associationName?: string
  registrationNumber?: string
}

export default function NewBuildingPage() {
  const [formData, setFormData] = useState({
    // معلومات أساسية
    name: '',
    plotNumber: '',
    neighborhood: '',
    description: '',
    
    // تفاصيل العمارة المتقدمة
    totalFloors: 1,
    totalUnits: 0,
    reservedUnits: 0,
    entrances: 1,
    parkingSlots: 0,
    elevators: 1,
    buildingFacing: 'north' as 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest',
    streetType: 'one' as 'one' | 'two',
    
    // معلومات الاتصال
    phone: '',
    yearBuilt: new Date().getFullYear(),
    
    // حقول جديدة - حالة البناء ومعلومات البناء
    buildStatus: 'ready' as 'ready' | 'under_construction' | 'finishing' | 'new_project',
    landArea: 0,
    buildingLicenseNumber: '',
    
    // معلومات التأمين
    insuranceAvailable: false,
    insurancePolicyNumber: '',
    
    // الحارس
    guardName: '',
    guardPhone: '',
    guardIdNumber: '',
    guardShift: 'day' as 'day' | 'night' | 'rotating',
    
    // الصور
    imageUrls: [] as string[],
    
    // موقع العمارة
    latitude: '',
    longitude: '',
    googleMapsLink: '',
  })

  const [floors, setFloors] = useState<Floor[]>([
    { 
      number: 1, 
      units: [],
      floorPlan: '4shuqq',
      unitsPerFloor: 4
    }
  ])

  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [expandedFloor, setExpandedFloor] = useState<number | null>(1)
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null)
  
  const [ownerAssociation, setOwnerAssociation] = useState<OwnerAssociation>({
    hasAssociation: false,
    startDate: '',
    endDate: '',
    monthlyFee: 0,
    contactNumber: '',
    associationName: '',
    registrationNumber: ''
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`الملف ${file.name} كبير جداً. الحد الأقصى 5MB`)
        return false
      }
      return true
    })

    const newPreviews = validFiles.map(file => URL.createObjectURL(file))
    
    setImages(prev => [...prev, ...validFiles])
    setImagePreviews(prev => [...prev, ...newPreviews])
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async (buildingId: string): Promise<string[]> => {
    const uploadedUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${buildingId}/${Date.now()}_${i}.${fileExt}`
      
      const { error } = await supabase.storage
        .from('building-images')
        .upload(fileName, file)

      if (error) {
        console.error('Error uploading image:', error)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('building-images')
        .getPublicUrl(fileName)

      uploadedUrls.push(publicUrl)
    }

    return uploadedUrls
  }

  const addFloor = () => {
    const newFloorNumber = floors.length + 1
    const newFloorPlan = floors[0]?.floorPlan || '4shuqq'
    const unitsPerFloor = newFloorPlan === '4shuqq' ? 4 : newFloorPlan === '3shuqq' ? 3 : 2
    
    const newUnits: Unit[] = []
    for (let i = 0; i < unitsPerFloor; i++) {
      newUnits.push({
        unitNumber: `${newFloorNumber}${String(i + 1).padStart(2, '0')}`,
        floor: newFloorNumber,
        type: 'apartment',
        area: 0,
        rooms: 1,
        bathrooms: 1,
        livingRooms: 1,
        kitchens: 1,
        maidRoom: false,
        driverRoom: false,
        acType: 'split',
        status: 'available',
        price: 0
      })
    }
    
    setFloors([...floors, { 
      number: newFloorNumber, 
      units: newUnits,
      floorPlan: newFloorPlan as any,
      unitsPerFloor
    }])
    setExpandedFloor(newFloorNumber)
    
    // تحديث إجمالي الوحدات
    const total = floors.reduce((sum, floor) => sum + floor.units.length, 0) + newUnits.length
    setFormData(prev => ({ ...prev, totalUnits: total }))
  }

  const removeFloor = (floorNumber: number) => {
    if (floors.length === 1) {
      alert('يجب أن يكون هناك دور واحد على الأقل')
      return
    }
    
    const floorToRemove = floors.find(f => f.number === floorNumber)
    const unitsCount = floorToRemove?.units.length || 0
    
    setFloors(floors.filter(f => f.number !== floorNumber))
    setFloors(prev => prev.map((f, index) => ({ ...f, number: index + 1 })))
    
    // تحديث إجمالي الوحدات
    const total = floors.reduce((sum, floor) => sum + floor.units.length, 0) - unitsCount
    setFormData(prev => ({ ...prev, totalUnits: total }))
  }

  const updateFloorPlan = (floorNumber: number, plan: '4shuqq' | '3shuqq' | '2shuqq') => {
    const unitsPerFloor = plan === '4shuqq' ? 4 : plan === '3shuqq' ? 3 : 2
    
    setFloors(floors.map(floor => {
      if (floor.number === floorNumber) {
        // إنشاء وحدات جديدة بناءً على النظام الجديد
        const newUnits: Unit[] = []
        for (let i = 0; i < unitsPerFloor; i++) {
          newUnits.push({
            unitNumber: `${floorNumber}${String(i + 1).padStart(2, '0')}`,
            floor: floorNumber,
            type: 'apartment',
            area: 0,
            rooms: 1,
            bathrooms: 1,
            livingRooms: 1,
            kitchens: 1,
            maidRoom: false,
            driverRoom: false,
            acType: 'split',
            status: 'available',
            price: 0
          })
        }
        return {
          ...floor,
          floorPlan: plan,
          unitsPerFloor,
          units: newUnits
        }
      }
      return floor
    }))
    
    // تحديث إجمالي الوحدات
    const total = floors.reduce((sum, floor) => {
      if (floor.number === floorNumber) {
        return sum + unitsPerFloor
      }
      return sum + floor.units.length
    }, 0)
    setFormData(prev => ({ ...prev, totalUnits: total }))
  }

  const addUnit = (floorNumber: number) => {
    setFloors(floors.map(floor => {
      if (floor.number === floorNumber) {
        const newUnit: Unit = {
          unitNumber: `${floorNumber}${String(floor.units.length + 1).padStart(2, '0')}`,
          floor: floorNumber,
          type: 'apartment',
          area: 0,
          rooms: 1,
          bathrooms: 1,
          livingRooms: 1,
          kitchens: 1,
          maidRoom: false,
          driverRoom: false,
          acType: 'split',
          status: 'available',
          price: 0
        }
        return {
          ...floor,
          units: [...floor.units, newUnit]
        }
      }
      return floor
    }))

    const total = floors.reduce((sum, floor) => sum + floor.units.length, 0) + 1
    setFormData(prev => ({ ...prev, totalUnits: total }))
  }

  const removeUnit = (floorNumber: number, unitIndex: number) => {
    setFloors(floors.map(floor => {
      if (floor.number === floorNumber) {
        const newUnits = floor.units.filter((_, i) => i !== unitIndex)
        return { ...floor, units: newUnits }
      }
      return floor
    }))

    const total = floors.reduce((sum, floor) => sum + floor.units.length, 0) - 1
    setFormData(prev => ({ ...prev, totalUnits: total }))
  }

  const updateUnit = (floorNumber: number, unitIndex: number, updates: Partial<Unit>) => {
    setFloors(floors.map(floor => {
      if (floor.number === floorNumber) {
        const updatedUnits = [...floor.units]
        updatedUnits[unitIndex] = { ...updatedUnits[unitIndex], ...updates }
        return { ...floor, units: updatedUnits }
      }
      return floor
    }))
  }

  const duplicateUnit = (floorNumber: number, unitIndex: number) => {
    setFloors(floors.map(floor => {
      if (floor.number === floorNumber) {
        const unitToDuplicate = floor.units[unitIndex]
        const newUnit = {
          ...unitToDuplicate,
          unitNumber: `${floorNumber}${String(floor.units.length + 1).padStart(2, '0')}`
        }
        return {
          ...floor,
          units: [...floor.units, newUnit]
        }
      }
      return floor
    }))

    const total = floors.reduce((sum, floor) => sum + floor.units.length, 0) + 1
    setFormData(prev => ({ ...prev, totalUnits: total }))
  }

  // إضافة دالة نسخ الدور لجميع الأدوار - Quick Add
  const copyFloorToAll = (sourceFloorNumber: number) => {
    const sourceFloor = floors.find(f => f.number === sourceFloorNumber)
    if (!sourceFloor || sourceFloor.units.length === 0) {
      alert('الدور خالٍ من الوحدات!')
      return
    }

    if (!confirm(`هل أنت متأكد من نسخ هذا الدور \u0625لى جميع الأدوار الأخرى؟ \n\nسيتم استبدال جميع الوحدات في الأدوار الأخرى.`)) {
      return
    }

    setFloors(floors.map(floor => {
      if (floor.number === sourceFloorNumber) return floor
      
      const newUnits = sourceFloor.units.map((unit, index) => ({
        ...unit,
        unitNumber: `${floor.number}${String(index + 1).padStart(2, '0')}`,
        floor: floor.number
      }))

      return {
        ...floor,
        units: newUnits,
        floorPlan: sourceFloor.floorPlan,
        unitsPerFloor: sourceFloor.unitsPerFloor
      }
    }))

    setSuccess(`تم نسخ الدور ${sourceFloorNumber} إلى جميع الأدوار بنجاح!`)
    setTimeout(() => setSuccess(''), 3000)
  }

  // إضافة وحدات بشكل سريع - Quick Add Units
  const quickAddUnits = () => {
    if (floors.length === 0) {
      alert('الرجاء إضافة دور واحد على الأقل')
      return
    }

    const floor1 = floors[0]
    if (floor1.units.length === 0) {
      alert('الرجاء إضافة وحدة واحدة على الأقل في الدور الأول كنموذج')
      return
    }

    copyFloorToAll(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep < steps.length) {
      setError('يرجى إكمال جميع الخطوات ثم تأكيد الحفظ من الخطوة الأخيرة')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      if (!formData.name || !formData.plotNumber) {
        throw new Error('الرجاء إدخال اسم العمارة ورقم القطعة')
      }

      const totalUnits = floors.reduce((sum, floor) => sum + floor.units.length, 0)

      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .insert([
          {
            name: formData.name,
            plot_number: formData.plotNumber,
            neighborhood: formData.neighborhood,
            description: formData.description || null,
            total_floors: floors.length,
            total_units: totalUnits,
            reserved_units: formData.reservedUnits,
            entrances: formData.entrances,
            parking_slots: formData.parkingSlots,
            elevators: formData.elevators,
            street_type: formData.streetType,
            phone: formData.phone || null,
            year_built: formData.yearBuilt,
            build_status: formData.buildStatus,
            land_area: formData.landArea || null,
            building_license_number: formData.buildingLicenseNumber || null,
            insurance_available: formData.insuranceAvailable,
            insurance_policy_number: formData.insuranceAvailable ? formData.insurancePolicyNumber : null,
            guard_name: formData.guardName || null,
            guard_phone: formData.guardPhone || null,
            guard_id_number: formData.guardIdNumber || null,
            guard_shift: formData.guardShift || null,
            owner_association: ownerAssociation.hasAssociation ? ownerAssociation : null,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            google_maps_link: formData.googleMapsLink || null,
            floors_data: floors,
            owner_id: user.id,
          }
        ])
        .select()
        .single()

      if (buildingError) throw buildingError

      if (images.length > 0) {
        const imageUrls = await uploadImages(building.id)
        
        const { error: updateError } = await supabase
          .from('buildings')
          .update({ image_urls: imageUrls })
          .eq('id', building.id)

        if (updateError) throw updateError
      }

      for (const floor of floors) {
        for (const unit of floor.units) {
          const { error: unitError } = await supabase
            .from('units')
            .insert([
              {
                building_id: building.id,
                unit_number: unit.unitNumber,
                floor: floor.number,
                type: unit.type,
                area: unit.area,
                rooms: unit.rooms,
                bathrooms: unit.bathrooms,
                living_rooms: unit.livingRooms,
                kitchens: unit.kitchens,
                maid_room: unit.maidRoom,
                driver_room: unit.driverRoom,
                ac_type: unit.acType,
                status: unit.status,
                price: unit.price,
                description: unit.description || null
              }
            ])

          if (unitError) throw unitError
        }
      }
      
      setSuccess('تم إضافة العمارة والوحدات بنجاح!')
      
      setTimeout(() => {
        router.push('/dashboard/buildings')
        router.refresh()
      }, 2000)
      
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'معلومات العمارة', icon: Building2, description: 'البيانات الأساسية' },
    { number: 2, title: 'تفاصيل العمارة', icon: Home, description: 'المداخل والمواقف والواجهة' },
    { number: 3, title: 'الوحدات السكنية', icon: Grid, description: 'إضافة وتفاصيل الشقق' },
    { number: 4, title: 'معلومات إضافية', icon: Users, description: 'الحارس والصور' },
    { number: 5, title: 'اتحاد الملاك', icon: Award, description: 'معلومات الاتحاد' },
  ]

  const facingOptions = [
    { value: 'north', label: 'شمال', icon: ArrowUp },
    { value: 'south', label: 'جنوب', icon: ArrowDown },
    { value: 'east', label: 'شرق', icon: ArrowLeftIcon },
    { value: 'west', label: 'غرب', icon: ArrowRight },
    { value: 'northeast', label: 'شمال شرق', icon: Compass },
    { value: 'northwest', label: 'شمال غرب', icon: Compass },
    { value: 'southeast', label: 'جنوب شرق', icon: Compass },
    { value: 'southwest', label: 'جنوب غرب', icon: Compass },
  ]

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const handleNextStep = () => {
    scrollToTop()
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePreviousStep = () => {
    scrollToTop()
    setCurrentStep(currentStep - 1)
  }

  const stepsContainerRef = useRef<HTMLDivElement | null>(null)
  const [trackLeftPx, setTrackLeftPx] = useState(0)
  const [trackTotalPx, setTrackTotalPx] = useState(0)
  const [isRTL, setIsRTL] = useState(true)

  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100

  useLayoutEffect(() => {
    const update = () => {
      const el = stepsContainerRef.current
      if (!el) return
      const buttons = Array.from(el.querySelectorAll('button')) as HTMLElement[]
      if (!buttons.length) return
      const first = buttons[0].getBoundingClientRect()
      const last = buttons[buttons.length - 1].getBoundingClientRect()
      // measure relative to the parent "relative" container so absolute positioning matches
      const parent = el.parentElement ?? el
      const parentRect = parent.getBoundingClientRect()

      const firstCenter = first.left - parentRect.left + first.width / 2
      const lastCenter = last.left - parentRect.left + last.width / 2

      setTrackLeftPx(firstCenter)
      setTrackTotalPx(Math.max(0, lastCenter - firstCenter))
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [steps.length])

  useEffect(() => {
    if (typeof document !== 'undefined') setIsRTL(document.dir === 'rtl')
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" dir="rtl">
      {/* الشريط العلوي - تصميم محسّن */}
      <div className="bg-white/90 shadow-lg border-b-2 border-indigo-100 sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/buildings" className="inline-flex items-center p-2 rounded-2xl hover:bg-indigo-50 transition-all duration-300 group">
                <span className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <ArrowLeft className="w-6 h-6 text-white" />
                </span>
              </Link>

              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
                  <span className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 animate-pulse">
                    <Building2 className="w-6 h-6" />
                  </span>
                  إضافة عمارة جديدة
                </h1>
                <p className="text-xs text-gray-600 flex items-center gap-2 mt-2">
                  <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                  أدخل جميع تفاصيل العمارة والوحدات السكنية بطريقة سهلة وسريعة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-2xl border-2 border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:border-indigo-300 group"
              >
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-indigo-100 group-hover:to-purple-100 transition-all">
                  <Home className="w-5 h-5 text-gray-700 group-hover:text-indigo-600 transition-colors" />
                </span>
                <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">الرئيسية</span>
              </Link>

              <Link
                href="/dashboard/buildings"
                className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl shadow-xl shadow-indigo-500/30 hover:shadow-2xl transform transition-all duration-300 hover:-translate-y-1 hover:scale-105"
              >
                <span className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </span>
                <span className="text-sm font-bold">قائمة العماير</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Steps Indicator - تصميم عصري */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-[34px]">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8 border border-white/20">
          <div className="relative">
            {trackTotalPx > 0 ? (
              <>
                <div
                  className="h-2 rounded-full absolute top-6 bg-gradient-to-l from-emerald-100 via-emerald-50 to-emerald-200"
                  style={{ left: `${trackLeftPx}px`, width: `${trackTotalPx}px` }}
                />

                {/* fill measured */}
                <div
                  className="h-2 rounded-full absolute top-6 bg-gradient-to-l from-green-400 to-emerald-500 transition-all duration-300"
                  style={{
                    left: `${isRTL ? trackLeftPx + (trackTotalPx - (progressPercent / 100) * trackTotalPx) : trackLeftPx}px`,
                    width: `${(progressPercent / 100) * trackTotalPx}px`,
                  }}
                />
              </>
            ) : (
              <>
                <div
                  className="h-2 rounded-full absolute top-6 bg-gradient-to-l from-emerald-100 via-emerald-50 to-emerald-200"
                  style={{ left: '20px', right: '20px' }}
                />

                {/* fill fallback (percentage of container) */}
                <div
                  className="h-2 rounded-full absolute top-6 bg-gradient-to-l from-green-400 to-emerald-500 transition-all duration-300"
                  style={isRTL ? { right: '20px', width: `${progressPercent}%` } : { left: '20px', width: `${progressPercent}%` }}
                />
              </>
            )}

            <div ref={stepsContainerRef} className="flex items-center justify-between relative z-10">
              {steps.map((step) => (
                <button
                  key={step.number}
                  onClick={() => setCurrentStep(step.number)}
                  className={`flex flex-col items-center -mt-3 transform transition-all duration-300 ${
                    currentStep >= step.number ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-3 mt-[10px] transition-transform duration-300 ${
                    currentStep > step.number
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white scale-110 shadow-xl shadow-green-500/20'
                      : currentStep === step.number
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white scale-125 shadow-xl shadow-indigo-500/20 ring-4 ring-indigo-100'
                      : 'bg-white border-2 border-gray-200 text-gray-500 group-hover:scale-105'
                  }`}>
                    {currentStep > step.number ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <step.icon className="w-4 h-4 md:w-5 md:h-5" />}
                  </div>
                  <span className={`text-sm font-bold ${currentStep === step.number ? 'text-gray-900' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">{step.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          
          {/* رسائل التنبيه */}
          {error && (
            <div className="m-6 p-4 bg-red-50/90 backdrop-blur-sm border-r-4 border-red-500 rounded-2xl flex items-start gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800 mb-1">خطأ</h4>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="m-6 p-4 bg-green-50/90 backdrop-blur-sm border-r-4 border-green-500 rounded-2xl flex items-start gap-3 animate-fadeIn">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-800 mb-1">تم بنجاح</h4>
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8">
            
            {/* Step 1: معلومات العمارة الأساسية */}
            {currentStep === 1 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-t-4 border-indigo-500 pt-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">معلومات العمارة الأساسية</h2>
                      <p className="text-xs text-gray-500">أدخل البيانات الرئيسية للعمارة</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* اسم العمارة */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      اسم العمارة <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition text-lg"
                        placeholder="مثال: عمارة النخيل"
                      />
                    </div>
                  </div>

                  {/* سنة البناء */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      سنة البناء
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        value={formData.yearBuilt}
                        onChange={(e) => setFormData({...formData, yearBuilt: parseInt(e.target.value) || new Date().getFullYear()})}
                        min="1900"
                        max={new Date().getFullYear()}
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* رقم القطعة */}
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        رقم القطعة <span className="text-red-500">*</span>
                      </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                          value={formData.plotNumber}
                          onChange={(e) => setFormData({...formData, plotNumber: e.target.value})}
                        required
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                          placeholder="مثال: قطعة 12/34 أو 12345"
                      />
                    </div>
                  </div>

                  {/* الحي */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      الحي <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                        required
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                        placeholder="مثال: حي النزهة"
                      />
                    </div>
                  </div>

                  {/* حالة البناء */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      حالة البناء <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition pointer-events-none">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <select
                        value={formData.buildStatus}
                        onChange={(e) => setFormData({...formData, buildStatus: e.target.value as any})}
                        required
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition appearance-none text-gray-700"
                      >
                        <option value="ready">جاهز</option>
                        <option value="under_construction">تحت الإنشاء</option>
                        <option value="finishing">تشطيب</option>
                        <option value="new_project">أرض مشروع جديد</option>
                      </select>
                    </div>
                  </div>

                  {/* مساحة الأرض */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      مساحة الأرض (م²)
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition">
                        <Ruler className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        value={formData.landArea || ''}
                        onChange={(e) => setFormData({...formData, landArea: parseFloat(e.target.value) || 0})}
                        step="0.01"
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                        placeholder="مثال: 500.50"
                      />
                    </div>
                  </div>

                  {/* رقم رخصة البناء */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      رقم رخصة البناء <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition">
                        <FileText className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={formData.buildingLicenseNumber}
                        onChange={(e) => setFormData({...formData, buildingLicenseNumber: e.target.value})}
                        required
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                        placeholder="مثال: 12345/2023"
                      />
                    </div>
                  </div>

                  {/* حالة التأمين - اختيار نعم/لا */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      هل يوجد تأمين على المبنى؟
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="yes"
                          checked={formData.insuranceAvailable === true}
                          onChange={() => setFormData({...formData, insuranceAvailable: true})}
                          className="w-4 h-4 accent-indigo-500"
                        />
                        <span className="text-gray-700">نعم</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="no"
                          checked={formData.insuranceAvailable === false}
                          onChange={() => setFormData({...formData, insuranceAvailable: false, insurancePolicyNumber: ''})}
                          className="w-4 h-4 accent-indigo-500"
                        />
                        <span className="text-gray-700">لا</span>
                      </label>
                    </div>
                  </div>

                  {/* رقم بوليصة التأمين - يظهر فقط إذا كان هناك تأمين */}
                  {formData.insuranceAvailable && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        رقم بوليصة التأمين <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition">
                          <Shield className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          value={formData.insurancePolicyNumber}
                          onChange={(e) => setFormData({...formData, insurancePolicyNumber: e.target.value})}
                          required={formData.insuranceAvailable}
                          className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                          placeholder="مثال: POL-2023-12345"
                        />
                      </div>
                    </div>
                  )}

                  {/* الوصف */}
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      وصف العمارة
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                      placeholder="اكتب وصفاً للعمارة..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: تفاصيل العمارة */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-t-4 border-emerald-500 pt-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <Home className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">تفاصيل العمارة</h2>
                      <p className="text-xs text-gray-500">المداخل - المواقف - الواجهة - المصاعد</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* عدد الأدوار مع نظام الدور */}
                  <div className="col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      عدد الأدوار
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition">
                        <Layers className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        value={formData.totalFloors}
                        onChange={(e) => {
                          const newTotal = parseInt(e.target.value) || 1
                          setFormData({...formData, totalFloors: newTotal})
                          // تعديل عدد الأدوار في قائمة floors
                          if (newTotal > floors.length) {
                            // إضافة أدوار جديدة
                            for (let i = floors.length + 1; i <= newTotal; i++) {
                              const newFloorPlan = floors[0]?.floorPlan || '4shuqq'
                              const unitsPerFloor = newFloorPlan === '4shuqq' ? 4 : newFloorPlan === '3shuqq' ? 3 : 2
                              const newUnits: Unit[] = []
                              for (let j = 0; j < unitsPerFloor; j++) {
                                newUnits.push({
                                  unitNumber: `${i}${String(j + 1).padStart(2, '0')}`,
                                  floor: i,
                                  type: 'apartment',
                                  area: 0,
                                  rooms: 1,
                                  bathrooms: 1,
                                  livingRooms: 1,
                                  kitchens: 1,
                                  maidRoom: false,
                                  driverRoom: false,
                                  acType: 'split',
                                  status: 'available',
                                  price: 0
                                })
                              }
                              setFloors(prev => [...prev, { 
                                number: i, 
                                units: newUnits,
                                floorPlan: newFloorPlan as any,
                                unitsPerFloor
                              }])
                            }
                          } else if (newTotal < floors.length) {
                            // حذف أدوار زائدة
                            setFloors(prev => prev.slice(0, newTotal))
                          }
                        }}
                        min="1"
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* عدد الشقق في الدور */}
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      عدد الشقق في الدور
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition pointer-events-none">
                        <Grid className="w-5 h-5" />
                      </div>
                      <select
                        value={floors[0]?.floorPlan || '4shuqq'}
                        onChange={(e) => {
                          floors.forEach(floor => {
                            updateFloorPlan(floor.number, e.target.value as any)
                          })
                        }}
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition appearance-none text-gray-700 font-medium"
                      >
                        <option value="4shuqq">٤ شقق</option>
                        <option value="3shuqq">٣ شقق</option>
                        <option value="2shuqq">٢ شقق</option>
                      </select>
                    </div>
                  </div>

                  {/* عدد المداخل */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      عدد المداخل
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition">
                        <DoorOpen className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        value={formData.entrances}
                        onChange={(e) => setFormData({...formData, entrances: parseInt(e.target.value) || 1})}
                        min="1"
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* عدد مواقف السيارات */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      عدد مواقف السيارات
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition">
                        <ParkingCircle className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        value={formData.parkingSlots}
                        onChange={(e) => setFormData({...formData, parkingSlots: parseInt(e.target.value) || 0})}
                        min="0"
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* عدد المصاعد */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      عدد المصاعد
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition">
                        <ArrowUp className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        value={formData.elevators}
                        onChange={(e) => setFormData({...formData, elevators: parseInt(e.target.value) || 1})}
                        min="0"
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* واجهة العمارة */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      واجهة العمارة
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'one', label: 'شارع واحد', icon: ArrowRight },
                        { value: 'two', label: 'شارعين', icon: ArrowLeftIcon }
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({...formData, streetType: option.value as any})}
                          className={`p-3 rounded-xl border-2 transition-all duration-300 flex items-center justify-center gap-2 ${
                            formData.streetType === option.value
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <option.icon className="w-4 h-4" />
                          <span className="text-sm">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* اتجاه العمارة */}
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      اتجاه العمارة
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition pointer-events-none">
                        <Compass className="w-5 h-5" />
                      </div>
                      <select
                        value={formData.buildingFacing}
                        onChange={(e) => setFormData({...formData, buildingFacing: e.target.value as any})}
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition appearance-none text-gray-700 font-medium"
                      >
                        <option value="north">شمال</option>
                        <option value="south">جنوب</option>
                        <option value="east">شرق</option>
                        <option value="west">غرب</option>
                        <option value="northeast">شمال شرق</option>
                        <option value="northwest">شمال غرب</option>
                        <option value="southeast">جنوب شرق</option>
                        <option value="southwest">جنوب غرب</option>
                      </select>
                    </div>
                  </div>

                  {/* الوحدات المحجوزة مع مؤشر الأداء */}
                  <div className="col-span-3 mt-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          الوحدات المحجوزة
                        </label>
                        <span className="text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                          {formData.reservedUnits} / {formData.totalUnits > 0 ? formData.totalUnits : '—'}
                        </span>
                      </div>
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <div className="relative group mb-3">
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <input
                              type="number"
                              value={formData.reservedUnits}
                              onChange={(e) => {
                                const reserved = Math.min(parseInt(e.target.value) || 0, formData.totalUnits)
                                setFormData({...formData, reservedUnits: Math.max(0, reserved)})
                              }}
                              max={formData.totalUnits || 0}
                              min="0"
                              className="w-full pr-14 pl-4 py-4 bg-white border-2 border-blue-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition"
                              placeholder="عدد الوحدات المحجوزة"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* مؤشر الأداء البصري */}
                      {formData.totalUnits > 0 && (
                        <div className="mt-4">
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                              style={{width: `${(formData.reservedUnits / formData.totalUnits) * 100}%`}}
                            />
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-600">نسبة الحجز</span>
                            <span className="text-sm font-bold text-blue-700">
                              {Math.round((formData.reservedUnits / formData.totalUnits) * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {formData.totalUnits === 0 && (
                        <div className="text-xs text-gray-500 text-center py-3">
                          أضف الوحدات أولاً لتحديد الوحدات المحجوزة
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Step 3: الوحدات السكنية - تصميم محسّن */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="border-t-4 border-gradient-to-r from-orange-500 to-amber-500 pt-6 rounded-t-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/40 animate-pulse">
                        <Grid className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">الوحدات السكنية</h2>
                        <p className="text-xs text-gray-600 flex items-center gap-2 mt-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          أضف وحدات دقيقة مع جميع التفاصيل بشكل سريع وسهل
                        </p>
                      </div>
                    </div>

                    {/* Quick Add Button - إضافة سريعة */}
                    <button
                      type="button"
                      onClick={quickAddUnits}
                      className="group relative inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      <Zap className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform" />
                      <span className="relative z-10 font-bold">تطبيق الدور الأول على الكل</span>
                      <Sparkles className="w-4 h-4 relative z-10 animate-pulse" />
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 mb-6 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-amber-900">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                        <Info className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-bold flex items-center gap-2">
                          <span className="text-3xl text-amber-900">{floors.reduce((sum, floor) => sum + floor.units.length, 0)}</span>
                          <span>وحدة إجمالاً</span>
                        </p>
                        <p className="text-xs text-amber-700 mt-1">موزعة على {floors.length} {floors.length === 1 ? 'دور' : 'أدوار'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {floors.map((f, idx) => (
                        <div key={idx} className="text-xs bg-white text-amber-700 px-3 py-2 rounded-xl shadow-sm font-bold border border-amber-200 hover:bg-amber-50 transition-colors">
                          د{f.number}: {f.units.length}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {floors.map((floor) => (
                  <div key={floor.number} className="border-2 border-gray-200 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                    {/* رأس الدور - تصميم محسّن */}
                    <div
                      className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
                      onClick={() => setExpandedFloor(expandedFloor === floor.number ? null : floor.number)}
                    >
                      {/* Animated Background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                            <Layers className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="font-black text-2xl">الدور {floor.number}</h3>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-sm bg-white/20 backdrop-blur px-4 py-1.5 rounded-full font-bold shadow-sm">
                                {floor.units.length} {floor.units.length === 1 ? 'وحدة' : 'وحدات'}
                              </span>
                              <span className="text-sm text-white/90 font-medium">
                                نظام: {
                                  floor.floorPlan === '4shuqq' ? '٤ شقق' :
                                  floor.floorPlan === '3shuqq' ? '٣ شقق' : 'شقتين'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              copyFloorToAll(floor.number)
                            }}
                            className="group/btn p-3 bg-emerald-500/30 backdrop-blur-sm text-white rounded-xl hover:bg-emerald-500/50 transition-all hover:scale-110 border border-white/30 shadow-lg"
                            title="نسخ هذا الدور لجميع الأدوار"
                          >
                            <Copy className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              addUnit(floor.number)
                            }}
                            className="group/btn p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all hover:scale-110 border border-white/30 shadow-lg"
                            title="إضافة وحدة جديدة"
                          >
                            <Plus className="w-5 h-5 group-hover/btn:rotate-90 transition-transform" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFloor(floor.number)
                            }}
                            className="group/btn p-3 bg-red-500/30 backdrop-blur-sm text-white rounded-xl hover:bg-red-500/50 transition-all hover:scale-110 border border-white/30 shadow-lg"
                            title="حذف الدور"
                          >
                            <Trash2 className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                            className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all shadow-lg"
                          >
                            {expandedFloor === floor.number ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* وحدات الدور - طريقة عرض محسّنة */}
                    {expandedFloor === floor.number && (
                      <div className="p-6 space-y-5 bg-gray-50/50">
                        {floor.units.map((unit, unitIndex) => (
                          <div key={unitIndex} className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                            {/* رأس الوحدة */}
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-gray-200 p-5 flex items-center justify-between cursor-pointer hover:bg-purple-100/50 transition-colors"
                              onClick={() => setExpandedUnit(expandedUnit === `${floor.number}-${unitIndex}` ? null : `${floor.number}-${unitIndex}`)}>
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                                  <Home className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 text-lg">الوحدة {unit.unitNumber}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                      {unit.type === 'apartment' ? 'شقة' : unit.type === 'studio' ? 'استوديو' : unit.type === 'duplex' ? 'دوبلكس' : 'بنتهاوس'}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      unit.status === 'available' ? 'bg-green-100 text-green-700' :
                                      unit.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {unit.status === 'available' ? 'متاح' : unit.status === 'reserved' ? 'محجوز' : 'مباع'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    duplicateUnit(floor.number, unitIndex)
                                  }}
                                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all hover:scale-110 shadow-sm"
                                  title="نسخ الوحدة"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeUnit(floor.number, unitIndex)
                                  }}
                                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all hover:scale-110 shadow-sm"
                                  title="حذف الوحدة"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                  }}
                                  className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-all"
                                >
                                  {expandedUnit === `${floor.number}-${unitIndex}` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {/* ملخص سريع - صف واحد */}
                            <div className="p-4 bg-white grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 border-b border-gray-100">
                              <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                <span className="text-xs text-gray-500 font-medium">المساحة</span>
                                <span className="text-sm font-bold text-blue-600">{unit.area || '—'} م²</span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                                <span className="text-xs text-gray-500 font-medium">السعر</span>
                                <span className="text-sm font-bold text-green-600">{unit.price ? unit.price.toLocaleString() : '—'} ر.س</span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                                <Bed className="w-3 h-3 text-gray-400 mb-1" />
                                <span className="text-sm font-bold text-purple-600">{unit.rooms} غ</span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                                <Bath className="w-3 h-3 text-gray-400 mb-1" />
                                <span className="text-sm font-bold text-orange-600">{unit.bathrooms} ح</span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors">
                                <Maximize className="w-3 h-3 text-gray-400 mb-1" />
                                <span className="text-sm font-bold text-pink-600">{unit.livingRooms}</span>
                              </div>
                              {unit.maidRoom && (
                                <div className="flex flex-col items-center p-2 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                                  <span className="text-xs font-bold text-yellow-600">خادمة</span>
                                </div>
                              )}
                            </div>

                            {/* التفاصيل المdéveloppées */}
                            {expandedUnit === `${floor.number}-${unitIndex}` && (
                              <div className="p-6 bg-gradient-to-b from-white to-gray-50 space-y-6 border-t-2 border-gray-200">
                                {/* الصف الأول - المعلومات الأساسية */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <Maximize className="w-4 h-4 text-blue-600" />
                                      المساحة (م²)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={unit.area}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { area: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition font-semibold text-lg"
                                      placeholder="0.00"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-green-600" />
                                      السعر (ر.س)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={unit.price}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { price: parseInt(e.target.value) || 0 })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition font-semibold text-lg"
                                      placeholder="0"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <Tag className="w-4 h-4 text-purple-600" />
                                      نوع الوحدة
                                    </label>
                                    <select
                                      value={unit.type}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { type: e.target.value as any })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition font-medium"
                                    >
                                      <option value="apartment">شقة</option>
                                      <option value="studio">ملحق</option>
                                      <option value="duplex">دوبلكس</option>
                                      <option value="penthouse">بنتهاوس</option>
                                    </select>
                                  </div>
                                </div>

                                {/* الصف الثاني - الغرف والحمامات */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <Bed className="w-4 h-4 text-red-500" />
                                      عدد الغرف
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={unit.rooms}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { rooms: parseInt(e.target.value) || 0 })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none transition font-semibold text-center text-lg"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <Bath className="w-4 h-4 text-cyan-500" />
                                      عدد الحمامات
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={unit.bathrooms}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { bathrooms: parseInt(e.target.value) || 0 })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 outline-none transition font-semibold text-center text-lg"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <Sofa className="w-4 h-4 text-amber-500" />
                                      صالات
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={unit.livingRooms}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { livingRooms: parseInt(e.target.value) || 0 })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition font-semibold text-center text-lg"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                                      مطابخ
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={unit.kitchens}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { kitchens: parseInt(e.target.value) || 0 })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition font-semibold text-center text-lg"
                                    />
                                  </div>
                                </div>

                                {/* الصف الثالث - الغرف الإضافية والتكييف */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <User className="w-4 h-4 text-indigo-600" />
                                      غرفة خادمة
                                    </label>
                                    <select
                                      value={unit.maidRoom ? 'yes' : 'no'}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { maidRoom: e.target.value === 'yes' })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition font-medium"
                                    >
                                      <option value="no">لا يوجد</option>
                                      <option value="yes">يوجد</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <User className="w-4 h-4 text-pink-600" />
                                      غرفة سائق
                                    </label>
                                    <select
                                      value={unit.driverRoom ? 'yes' : 'no'}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { driverRoom: e.target.value === 'yes' })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 outline-none transition font-medium"
                                    >
                                      <option value="no">لا يوجد</option>
                                      <option value="yes">يوجد</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <Wind className="w-4 h-4 text-sky-500" />
                                      التكييف
                                    </label>
                                    <select
                                      value={unit.acType}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { acType: e.target.value as any })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none transition font-medium"
                                    >
                                      <option value="split">سبلت</option>
                                      <option value="window">شباك</option>
                                      <option value="splitWindow">سبلت + شباك</option>
                                      <option value="central">مركزي</option>
                                      <option value="none">لا يوجد</option>
                                    </select>
                                  </div>
                                </div>

                                {/* الصف الرابع - الحالة والوصف */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                                      حالة الوحدة
                                    </label>
                                    <select
                                      value={unit.status}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { status: e.target.value as any })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition font-medium"
                                    >
                                      <option value="available">متاح</option>
                                      <option value="reserved">محجوز</option>
                                      <option value="sold">مباع</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-slate-600" />
                                      الوصف
                                    </label>
                                    <input
                                      type="text"
                                      value={unit.description || ''}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { description: e.target.value })}
                                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-4 focus:ring-slate-100 outline-none transition font-medium"
                                      placeholder="وصف اختياري للوحدة..."
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* زر إضافة دور جديد - تصميم محسّن */}
                <button
                  type="button"
                  onClick={addFloor}
                  className="w-full py-8 border-3 border-dashed border-indigo-300 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all duration-300 group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center group-hover:scale-125 group-hover:shadow-lg transition-transform">
                      <Plus className="w-7 h-7 text-indigo-600 group-hover:text-indigo-700" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg text-gray-700 group-hover:text-indigo-700 block">إضافة دور جديد</span>
                      <span className="text-xs text-gray-500 group-hover:text-indigo-600">انقر لإضافة دور إضافي للعمارة</span>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Step 4: معلومات إضافية - الحارس والصور */}
            {currentStep === 4 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-t-4 border-blue-500 pt-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">معلومات الحارس والصور</h2>
                      <p className="text-xs text-gray-500">بيانات الحارس وصور العمارة</p>
                    </div>
                  </div>
                </div>

                {/* معلومات الحارس */}
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 border-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-semibold text-gray-800">معلومات الحارس</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">اسم الحارس</label>
                      <div className="relative group">
                        <User className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.guardName}
                          onChange={(e) => setFormData({...formData, guardName: e.target.value})}
                          className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                          placeholder="اسم الحارس"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">رقم جوال الحارس</label>
                      <div className="relative group">
                        <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.guardPhone}
                          onChange={(e) => setFormData({...formData, guardPhone: e.target.value})}
                          className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                          placeholder="05xxxxxxxx"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهوية</label>
                      <input
                        type="text"
                        value={formData.guardIdNumber}
                        onChange={(e) => setFormData({...formData, guardIdNumber: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                        placeholder="رقم الهوية"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">فترة العمل</label>
                      <select
                        value={formData.guardShift}
                        onChange={(e) => setFormData({...formData, guardShift: e.target.value as any})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                      >
                        <option value="day">صباحي</option>
                        <option value="night">مسائي</option>
                        <option value="rotating">متناوب</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* رفع الصور */}
                <div className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-2xl p-8 border-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-6">
                    <Camera className="w-6 h-6 text-purple-600" />
                    <h3 className="text-xl font-semibold text-gray-800">صور العمارة</h3>
                  </div>
                  
                  <div className="mb-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-12 border-3 border-dashed border-gray-300 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 group"
                    >
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4 group-hover:text-purple-500 transition-colors" />
                      <p className="text-gray-600 text-lg group-hover:text-purple-600 transition-colors">
                        اضغط لرفع الصور أو اسحب وأفلت
                      </p>
                      <p className="text-sm text-gray-400 mt-3">PNG, JPG, JPEG (الحد الأقصى 5MB لكل صورة)</p>
                    </button>
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group rounded-xl overflow-hidden border-2 border-gray-200 hover:border-purple-500 transition-all">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {index === 0 && (
                            <div className="absolute bottom-2 left-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs rounded-full shadow-lg">
                              الرئيسية
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* الموقع */}
                <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-2xl p-8 border-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-6 h-6 text-emerald-600" />
                    <h3 className="text-xl font-semibold text-gray-800">الموقع على الخريطة</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">خط العرض (Latitude)</label>
                      <input
                        type="text"
                        value={formData.latitude}
                        onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                        placeholder="مثال: 24.7136"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">خط الطول (Longitude)</label>
                      <input
                        type="text"
                        value={formData.longitude}
                        onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                        placeholder="مثال: 46.6753"
                        dir="ltr"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">رابط خرائط Google</label>
                      <input
                        type="url"
                        value={formData.googleMapsLink}
                        onChange={(e) => setFormData({...formData, googleMapsLink: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                        placeholder="https://maps.google.com/..."
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: اتحاد الملاك */}
            {currentStep === 5 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-t-4 border-amber-500 pt-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">اتحاد الملاك</h2>
                      <p className="text-xs text-gray-500">معلومات اتحاد الملاك إن وجد</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-amber-50 rounded-2xl p-8 border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <Award className="w-6 h-6 text-amber-600" />
                      <h3 className="text-xl font-semibold text-gray-800">بيانات الاتحاد</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ownerAssociation.hasAssociation}
                        onChange={(e) => setOwnerAssociation({
                          ...ownerAssociation,
                          hasAssociation: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:right-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-600"></div>
                      <span className="mr-4 text-sm font-medium text-gray-700">
                        {ownerAssociation.hasAssociation ? 'يوجد اتحاد ملاك' : 'لا يوجد اتحاد ملاك'}
                      </span>
                    </label>
                  </div>

                  {ownerAssociation.hasAssociation && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 animate-fadeIn">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">اسم الاتحاد</label>
                        <input
                          type="text"
                          value={ownerAssociation.associationName}
                          onChange={(e) => setOwnerAssociation({ ...ownerAssociation, associationName: e.target.value })}
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-amber-500 outline-none"
                          placeholder="اسم اتحاد الملاك"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">رقم السجل</label>
                        <input
                          type="text"
                          value={ownerAssociation.registrationNumber}
                          onChange={(e) => setOwnerAssociation({ ...ownerAssociation, registrationNumber: e.target.value })}
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-amber-500 outline-none"
                          placeholder="رقم السجل"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ بداية الاتحاد</label>
                        <div className="relative group">
                          <CalendarDays className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="date"
                            value={ownerAssociation.startDate}
                            onChange={(e) => setOwnerAssociation({ ...ownerAssociation, startDate: e.target.value })}
                            className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-amber-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ نهاية الاتحاد</label>
                        <div className="relative group">
                          <CalendarDays className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="date"
                            value={ownerAssociation.endDate}
                            onChange={(e) => setOwnerAssociation({ ...ownerAssociation, endDate: e.target.value })}
                            className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-amber-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">الرسم الشهري (ر.س)</label>
                        <div className="relative group">
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">ر.س</span>
                          <input
                            type="number"
                            value={ownerAssociation.monthlyFee}
                            onChange={(e) => setOwnerAssociation({ ...ownerAssociation, monthlyFee: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-amber-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">رقم التواصل</label>
                        <div className="relative group">
                          <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="tel"
                            value={ownerAssociation.contactNumber}
                            onChange={(e) => setOwnerAssociation({ ...ownerAssociation, contactNumber: e.target.value })}
                            className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-amber-500 outline-none"
                            placeholder="05xxxxxxxx"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* أزرار التنقل - تصميم محسّن مع Scroll to Top */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t-2 border-gray-200">
              <div>
                <Link
                  href="/dashboard/buildings"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white border-2 border-red-300 text-red-600 rounded-full hover:bg-red-50 transition-all duration-300 font-semibold hover:scale-105 hover:shadow-lg"
                >
                  إلغاء
                </Link>
              </div>

              <div className="flex items-center gap-4">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="inline-flex items-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 transition-all duration-300 font-semibold hover:scale-105 hover:shadow-lg"
                  >
                    <ChevronRight className="w-4 h-4" />
                    السابق
                  </button>
                )}

                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg shadow-indigo-500/25 hover:scale-105"
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || uploading}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg shadow-green-500/25 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'جاري الحفظ...' : 'حفظ العمارة'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}