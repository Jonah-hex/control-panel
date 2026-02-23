// src/app/dashboard/buildings/new/page.tsx
'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showToast } from '../details/toast'
import { 
  ArrowLeft, 
  Save,
  Building2,
  MapPin,
  Home,
  X,
  Check,
  CheckCircle,
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
  DollarSign,
  Key,
  CreditCard,
  Wallet,
  Euro,
  BadgeCheck,
  PoundSterling,
  Bitcoin,
  Percent,
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
  facing: 'front' | 'back' | 'corner'
  area: number
  rooms: number
  bathrooms: number
  livingRooms: number
  kitchens: number
  maidRoom: boolean
  driverRoom: boolean
  entrances: number
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
  managerName?: string
  registrationNumber?: string
  registeredUnitsCount?: number
  iban?: string
  accountNumber?: string
  includesElectricity?: boolean
  includesWater?: boolean
}

export default function NewBuildingPage() {


  const [formData, setFormData] = useState({
    // معلومات أساسية
    name: '',
    ownerName: '',
    plotNumber: '',
    neighborhood: '',
    description: '',
    
    // تفاصيل العمارة المتقدمة
    totalFloors: 1,
    unitsPerFloor: 2,
    totalUnits: 0,
    reservedUnits: 0,
    parkingSlots: 0,
    driverRooms: 0,
    elevators: 1,
    buildingFacing: 'north' as 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest',
    streetType: 'one' as 'one' | 'two',
    
    // معلومات الاتصال
    phone: '',
    yearBuilt: new Date().getFullYear(),
    
    // حقول جديدة - حالة البناء ومعلومات البناء
    buildStatus: 'ready' as 'ready' | 'under_construction' | 'finishing' | 'new_project',
    deedNumber: '',
    landArea: 0,
    buildingLicenseNumber: '',
    
    // معلومات التأمين
    insuranceAvailable: false,
    insurancePolicyNumber: '',
    
    // عدادات المياه والكهرباء
    hasMainWaterMeter: false,
    waterMeterNumber: '',
    hasMainElectricityMeter: false,
    electricityMeterNumber: '',
    
    // الحارس
    guardName: '',
    guardPhone: '',
    guardRoomNumber: '',
    guardIdPhoto: '',
    guardShift: 'day' as 'day' | 'night' | 'permanent',
    hasSalary: false,
    salaryAmount: 0,
    
    // الصور
    imageUrls: [] as string[],
    
    // موقع العمارة
    googleMapsLink: '',
  })

  const [floors, setFloors] = useState<Floor[]>([]);

  useEffect(() => {
    setFloors(prevFloors => {
      const newFloors = [...prevFloors];
      // إضافة أدوار جديدة إذا زاد العدد
      while (newFloors.length < formData.totalFloors) {
        newFloors.push({
          number: newFloors.length + 1,
          units: Array(formData.unitsPerFloor).fill(null).map((_, idx) => ({
            unitNumber: `${idx + 1}`,
            floor: newFloors.length + 1,
            type: 'apartment',
            facing: 'front',
            area: 0,
            rooms: 1,
            bathrooms: 1,
            livingRooms: 1,
            kitchens: 1,
            maidRoom: false,
            driverRoom: false,
            entrances: 1,
            acType: 'split',
            status: 'available',
            price: 0
          })),
          floorPlan: (formData.unitsPerFloor === 4 ? '4shuqq' : formData.unitsPerFloor === 3 ? '3shuqq' : '2shuqq'),
          unitsPerFloor: formData.unitsPerFloor
        });
      }
      // حذف أدوار إذا نقص العدد
      while (newFloors.length > formData.totalFloors) {
        newFloors.pop();
      }
      // تحديث عدد الوحدات في كل دور حسب unitsPerFloor
      for (let i = 0; i < newFloors.length; i++) {
        const units = newFloors[i].units;
        if (units.length < formData.unitsPerFloor) {
          // أضف وحدات جديدة
          for (let j = units.length; j < formData.unitsPerFloor; j++) {
            units.push({
              unitNumber: `${j + 1}`,
              floor: i + 1,
              type: 'apartment',
              facing: 'front',
              area: 0,
              rooms: 1,
              bathrooms: 1,
              livingRooms: 1,
              kitchens: 1,
            maidRoom: false,
            driverRoom: false,
            entrances: 1,
            acType: 'split',
            status: 'available',
            price: 0
            });
          }
        } else if (units.length > formData.unitsPerFloor) {
          // احذف الوحدات الزائدة
          units.length = formData.unitsPerFloor;
        }
        newFloors[i].unitsPerFloor = formData.unitsPerFloor;
      }
      return newFloors;
    });
  }, [formData.totalFloors, formData.unitsPerFloor]);

  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [expandedFloor, setExpandedFloor] = useState<number | null>(1)
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showApplyRepeaterModal, setShowApplyRepeaterModal] = useState(false)
  const [applyRepeaterModalInfo, setApplyRepeaterModalInfo] = useState<{ lastFloorNumber: number; repeaterCount: number } | null>(null)
  
  const [ownerAssociation, setOwnerAssociation] = useState<OwnerAssociation>({
    hasAssociation: false,
    startDate: '',
    endDate: '',
    monthlyFee: 0,
    contactNumber: '',
    managerName: '',
    registrationNumber: '',
    registeredUnitsCount: 0,
    iban: '',
    accountNumber: '',
    includesElectricity: false,
    includesWater: false
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
    const unitsPerFloor = formData.unitsPerFloor
    
    const newUnits: Unit[] = []
    const totalExistingUnits = floors.reduce((sum, f) => sum + f.units.length, 0)
    
    for (let i = 0; i < unitsPerFloor; i++) {
      newUnits.push({
        unitNumber: `${totalExistingUnits + i + 1}`,
        floor: newFloorNumber,
        type: 'apartment',
        facing: 'front',
        area: 0,
        rooms: 1,
        bathrooms: 1,
        livingRooms: 1,
        kitchens: 1,
        maidRoom: false,
        driverRoom: false,
        entrances: 1,
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
    const total = totalExistingUnits + newUnits.length
    setFormData(prev => ({ ...prev, totalUnits: total }))
  }

  const removeFloor = (floorNumber: number) => {
    if (floors.length === 1) {
      showToast('تنبيه من النظام: يجب أن يكون هناك دور واحد على الأقل')
      return
    }
    
    const floorToRemove = floors.find(f => f.number === floorNumber)
    const unitsCount = floorToRemove?.units.length || 0
    
    // إزالة الدور
    let updatedFloors = floors.filter(f => f.number !== floorNumber)
    
    // إعادة ترقيم الأدوار
    updatedFloors = updatedFloors.map((f, index) => ({ ...f, number: index + 1 }))
    
    // إعادة ترقيم جميع الوحدات بشكل متسلسل
    let sequentialNumber = 1
    updatedFloors = updatedFloors.map(floor => ({
      ...floor,
      units: floor.units.map(unit => ({
        ...unit,
        unitNumber: String(sequentialNumber++),
        floor: floor.number
      }))
    }))
    
    setFloors(updatedFloors)
    
    // تحديث إجمالي الوحدات
    const total = updatedFloors.reduce((sum, floor) => sum + floor.units.length, 0)
    setFormData(prev => ({ ...prev, totalUnits: total }))
  }

  const updateFloorPlan = (floorNumber: number, plan: '4shuqq' | '3shuqq' | '2shuqq') => {
    const unitsPerFloor = formData.unitsPerFloor
    
    const updatedFloors = floors.map(floor => {
      if (floor.number === floorNumber) {
        // إنشاء وحدات جديدة بناءً على النظام الجديد
        const newUnits: Unit[] = []
        for (let i = 0; i < unitsPerFloor; i++) {
          newUnits.push({
            unitNumber: '', // سيتم تعيينها بعد إعادة الترقيم
            floor: floorNumber,
            type: 'apartment',
            facing: 'front',
            area: 0,
            rooms: 1,
            bathrooms: 1,
            livingRooms: 1,
            kitchens: 1,
            maidRoom: false,
            driverRoom: false,
            entrances: 1,
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
    })
    
    // إعادة ترقيم جميع الوحدات بشكل متسلسل
    let sequentialNumber = 1
    const finalFloors = updatedFloors.map(floor => ({
      ...floor,
      units: floor.units.map(unit => ({
        ...unit,
        unitNumber: String(sequentialNumber++)
      }))
    }))
    
    setFloors(finalFloors)
    
    // تحديث إجمالي الوحدات
    const total = finalFloors.reduce((sum, floor) => sum + floor.units.length, 0)
    setFormData(prev => ({ ...prev, totalUnits: total }))
  }

  const addUnit = (floorNumber: number) => {
    const updatedFloors = floors.map(floor => {
      if (floor.number === floorNumber) {
        const newUnit: Unit = {
          unitNumber: '', // سيتم تعيينها بعد إعادة الترقيم
          floor: floorNumber,
          type: 'apartment',
          facing: 'front',
          area: 0,
          rooms: 1,
          bathrooms: 1,
          livingRooms: 1,
          kitchens: 1,
          maidRoom: false,
          driverRoom: false,
          entrances: 1,
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
    })

    // إعادة ترقيم جميع الوحدات بشكل متسلسل
    let sequentialNumber = 1
    const finalFloors = updatedFloors.map(floor => ({
      ...floor,
      units: floor.units.map(unit => ({
        ...unit,
        unitNumber: String(sequentialNumber++)
      }))
    }))

    setFloors(finalFloors)

    const total = finalFloors.reduce((sum, floor) => sum + floor.units.length, 0)
    setFormData(prev => ({ ...prev, totalUnits: total }))
  }

  const removeUnit = (floorNumber: number, unitIndex: number) => {
    const updatedFloors = floors.map(floor => {
      if (floor.number === floorNumber) {
        const newUnits = floor.units.filter((_, i) => i !== unitIndex)
        return { ...floor, units: newUnits }
      }
      return floor
    })

    // إعادة ترقيم جميع الوحدات بشكل متسلسل
    let sequentialNumber = 1
    const finalFloors = updatedFloors.map(floor => ({
      ...floor,
      units: floor.units.map(unit => ({
        ...unit,
        unitNumber: String(sequentialNumber++)
      }))
    }))

    setFloors(finalFloors)

    const total = finalFloors.reduce((sum, floor) => sum + floor.units.length, 0)
    setFormData(prev => ({ ...prev, totalUnits: total }))
  }

  const formatPriceWithCommas = (n: number) => (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const parsePriceInput = (s: string) => parseInt(String(s).replace(/[^\d]/g, '')) || 0

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

  // إضافة دالة نسخ الدور لجميع الأدوار - Quick Add
  const copyFloorToAll = (sourceFloorNumber: number) => {
    const sourceFloor = floors.find(f => f.number === sourceFloorNumber)
    if (!sourceFloor || sourceFloor.units.length === 0) {
      alert('الدور خالٍ من الوحدات!')
      return
    }

    if (!confirm(`هل أنت متأكد من نسخ هذا الدور إلى جميع الأدوار الأخرى؟ \n\nسيتم استبدال جميع الوحدات في الأدوار الأخرى.`)) {
      return
    }

    let updatedFloors = floors.map(floor => {
      if (floor.number === sourceFloorNumber) return floor
      
      const newUnits = sourceFloor.units.map((unit, index) => ({
        ...unit,
        unitNumber: '', // سيتم تعيينها بعد إعادة الترقيم
        floor: floor.number
      }))

      return {
        ...floor,
        units: newUnits,
        floorPlan: sourceFloor.floorPlan,
        unitsPerFloor: sourceFloor.unitsPerFloor
      }
    })

    // إعادة ترقيم جميع الوحدات بشكل متسلسل
    let sequentialNumber = 1
    updatedFloors = updatedFloors.map(floor => ({
      ...floor,
      units: floor.units.map(unit => ({
        ...unit,
        unitNumber: String(sequentialNumber++)
      }))
    }))

    setFloors(updatedFloors)

    // تحديث إجمالي الوحدات
    const total = updatedFloors.reduce((sum, floor) => sum + floor.units.length, 0)
    setFormData(prev => ({ ...prev, totalUnits: total }))

    setSuccess(`تم نسخ الدور ${sourceFloorNumber} إلى جميع الأدوار بنجاح!`)
    setTimeout(() => setSuccess(''), 3000)
  }

  // تطبيق الدور الأول على المكرر فقط (من الدور 2 حتى ما قبل الأخير، باستثناء الأخير)
  const applyFirstFloorToRepeater = () => {
    if (floors.length < 2) {
      showToast('يجب أن يكون هناك دوران على الأقل لتطبيق المكرر')
      return
    }

    const floor1 = floors[0]
    if (!floor1 || floor1.units.length === 0) {
      showToast('الرجاء إضافة وحدة واحدة على الأقل في الدور الأول كنموذج')
      return
    }

    const lastFloorNumber = floors.length
    const repeaterCount = lastFloorNumber - 2 // عدد أدوار المكرر: من 2 إلى قبل الأخير
    if (repeaterCount < 1) {
      showToast('لا يوجد مكرر (يُحتاج 3 أدوار على الأقل: أول، مكرر، أخير)')
      return
    }

    setApplyRepeaterModalInfo({ lastFloorNumber, repeaterCount })
    setShowApplyRepeaterModal(true)
    return
  }

  const executeApplyFirstFloorToRepeater = () => {
    if (!applyRepeaterModalInfo) return
    const floor1 = floors[0]
    if (!floor1) return
    const { lastFloorNumber, repeaterCount } = applyRepeaterModalInfo
    setShowApplyRepeaterModal(false)
    setApplyRepeaterModalInfo(null)

    let updatedFloors = floors.map((floor) => {
      // نطبق فقط على الأدوار من 2 إلى قبل الأخير
      if (floor.number === 1 || floor.number === lastFloorNumber) return floor

      const newUnits = floor1.units.map((unit) => ({
        ...unit,
        unitNumber: '',
        floor: floor.number
      }))

      return {
        ...floor,
        units: newUnits,
        floorPlan: floor1.floorPlan,
        unitsPerFloor: floor1.unitsPerFloor
      }
    })

    let sequentialNumber = 1
    updatedFloors = updatedFloors.map((floor) => ({
      ...floor,
      units: floor.units.map((unit) => ({
        ...unit,
        unitNumber: String(sequentialNumber++)
      }))
    }))

    setFloors(updatedFloors)
    const total = updatedFloors.reduce((sum, floor) => sum + floor.units.length, 0)
    setFormData((prev) => ({ ...prev, totalUnits: total }))

    setSuccess(`تم تطبيق الدور الأول على ${repeaterCount} ${repeaterCount === 1 ? 'دور المكرر' : 'أدوار المكرر'} بنجاح (الدور الأخير غير متأثر).`)
    setTimeout(() => setSuccess(''), 3000)
  }

  // إضافة وحدات بشكل سريع - يستدعي تطبيق المكرر
  const quickAddUnits = () => {
    applyFirstFloorToRepeater()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Only move to next step, never save from form submission
    if (currentStep < steps.length) {
      handleNextStep()
    }
  }

  // ==========================================
  // 🎯 سياسة الترقيم المتسلسل العالمي
  // Sequential Global Numbering Policy
  // ==========================================
  // أرقام الوحدات تبدأ من 1 وتزيد بشكل متسلسل عبر جميع الأدوار
  // Unit numbers start from 1 and increment sequentially across all floors
  // لا توجد أرقام مكررة - No duplicate numbers
  // تُطبق في جميع العمليات (إضافة/حذف/تعديل) - Applied to all operations (add/remove/edit)
  // ==========================================
  
  const ensureSequentialNumbering = () => {
    // التحقق والإصلاح التلقائي: ضمان أرقام متسلسلة صحيحة قبل الحفظ
    // Verify and auto-fix: Ensure correct sequential numbering before saving
    let sequentialNumber = 1
    const correctedFloors = floors.map(floor => ({
      ...floor,
      units: floor.units.map(unit => ({
        ...unit,
        unitNumber: String(sequentialNumber++)
      }))
    }))
    
    return correctedFloors
  }

  const confirmSaveBuilding = async () => {
    setShowConfirmModal(false)

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // ==========================================
      // 0️⃣ تطبيق سياسة الترقيم المتسلسل العالمي
      // Apply Sequential Numbering Policy
      // ==========================================
      const floorsWithSequentialNumbers = ensureSequentialNumbering()
      console.log('🔢 تم تطبيق سياسة الترقيم المتسلسل:', {
        totalUnits: floorsWithSequentialNumbers.reduce((sum, floor) => sum + floor.units.length, 0),
        firstUnitNumber: floorsWithSequentialNumbers[0]?.units[0]?.unitNumber,
        lastUnitNumber: floorsWithSequentialNumbers[floorsWithSequentialNumbers.length - 1]?.units[floorsWithSequentialNumbers[floorsWithSequentialNumbers.length - 1]?.units.length - 1]?.unitNumber
      })

      // ==========================================
      // 1️⃣ التحقق من تسجيل الدخول
      // Verify User Authentication
      // ==========================================
      const { data: { user } } = await supabase.auth.getUser()
      }
      
      if (!user) {
        setError('يجب تسجيل الدخول أولاً')
        router.push('/login')
        return
      }

      // ==========================================
      // 2️⃣ التحقق من البيانات المطلوبة
      // Validate Required Fields
      // ==========================================
      if (!formData.name) {
        throw new Error('الرجاء إدخال اسم العمارة')
      }
      if (!formData.ownerName?.trim()) {
        throw new Error('الرجاء إدخال اسم المالك')
      }

      const totalUnits = floorsWithSequentialNumbers.reduce((sum, floor) => sum + floor.units.length, 0)
      
      // ==========================================
      // تحقق من أرقام الوحدات المكررة أو الفارغة
      // Check for Duplicate or Empty Unit Numbers
      // ==========================================
      const unitNumbers = new Set<string>()
      const duplicateNumbers: string[] = []
      
      for (const floor of floorsWithSequentialNumbers) {
        for (const unit of floor.units) {
          if (!unit.unitNumber || unit.unitNumber.trim() === '') {
            throw new Error(`وجدت وحدة في الدور ${floor.number} بدون رقم. الرجاء التأكد من إدخال أرقام صحيحة`)
          }
          
          if (unitNumbers.has(unit.unitNumber)) {
            if (!duplicateNumbers.includes(unit.unitNumber)) {
              duplicateNumbers.push(unit.unitNumber)
            }
          } else {
            unitNumbers.add(unit.unitNumber)
          }
        }
      }
      
      if (duplicateNumbers.length > 0) {
        throw new Error(`❌ أرقام وحدات مكررة: ${duplicateNumbers.join(', ')}. الرجاء تحديث الأرقام لجعلها فريدة`)
      }
      
      console.log('📊 بدء حفظ العمارة:', {
        name: formData.name,
        neighborhood: formData.neighborhood || 'غير محدد',
        plot_number: formData.plotNumber || 'غير محدد',
        total_floors: floors.length,
        total_units: totalUnits,
        has_association: ownerAssociation.hasAssociation,
        images_count: images.length
      })

      // ==========================================
      // 3️⃣ حفظ بيانات العمارة - جميع الحقول
      // Save Building Data - ALL FIELDS from 5 Steps
      // يتطلب تنفيذ: ADD_ALL_COLUMNS_COMPLETE.sql أولاً
      // Requires running: ADD_ALL_COLUMNS_COMPLETE.sql first
      // ==========================================

      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .insert([
          {
            // 📋 الخطوة 1 - معلومات العمارة الأساسية
            // Step 1 - Basic Building Information
            name: formData.name,
            owner_name: formData.ownerName?.trim() || null,
            plot_number: formData.plotNumber || null,
            neighborhood: formData.neighborhood || null,
            address: [formData.neighborhood, formData.plotNumber ? `قطعة ${formData.plotNumber}` : ''].filter(Boolean).join(' - ') || null,
            description: formData.description || null,
            phone: formData.phone || null,
            
            // 📋 الخطوة 2 - تفاصيل العمارة
            // Step 2 - Building Details
            total_floors: floorsWithSequentialNumbers.length,
            total_units: totalUnits,
            unitsperfloor: formData.unitsPerFloor || null,
            // reserved_units: formData.reservedUnits || 0, (تم حذفه من قاعدة البيانات)
            parking_slots: formData.parkingSlots || 0,
            driver_rooms: formData.driverRooms || 0,
            elevators: formData.elevators || 1,
            entrances: 1,
            street_type: formData.streetType || 'one',
            building_facing: formData.buildingFacing || 'north',
            year_built: formData.yearBuilt || null,
            
            // معلومات قانونية - Legal Information
            build_status: formData.buildStatus || 'ready',
            deed_number: formData.deedNumber || null,
            land_area: formData.landArea || null,
            building_license_number: formData.buildingLicenseNumber || null,
            
            // معلومات التأمين - Insurance Information
            insurance_available: formData.insuranceAvailable || false,
            insurance_policy_number: formData.insuranceAvailable ? (formData.insurancePolicyNumber || null) : null,
            
            // عدادات المرافق - Utility Meters
            has_main_water_meter: formData.hasMainWaterMeter || false,
            water_meter_number: formData.hasMainWaterMeter ? (formData.waterMeterNumber || null) : null,
            has_main_electricity_meter: formData.hasMainElectricityMeter || false,
            electricity_meter_number: formData.hasMainElectricityMeter ? (formData.electricityMeterNumber || null) : null,
            
            // 📋 الخطوة 3 - الوحدات (تُحفظ في جدول منفصل)
            // Step 3 - Units (saved in separate table with sequential numbering)
            // الوحدات محفوظة برقم متسلسل ضماني
            // floors_data: floorsWithSequentialNumbers, (تم حذفه من قاعدة البيانات)
            
            // 📋 الخطوة 4 - معلومات إضافية
            // Step 4 - Additional Information
            
            // معلومات الحارس - Guard Information
            guard_name: formData.guardName || null,
            guard_phone: formData.guardPhone || null,
            guard_room_number: formData.guardRoomNumber || null,
            guard_id_photo: formData.guardIdPhoto || null,
            guard_shift: formData.guardShift || null,
            guard_has_salary: formData.hasSalary || false,
            guard_salary_amount: formData.hasSalary ? (formData.salaryAmount || null) : null,
            
            // الموقع - Location
            google_maps_link: formData.googleMapsLink || null,
            // image_urls سيتم تحديثه بعد رفع الصور
            
            // 📋 الخطوة 5 - اتحاد الملاك
            // Step 5 - Owner Association
            owner_association: ownerAssociation.hasAssociation ? {
              hasAssociation: ownerAssociation.hasAssociation,
              managerName: ownerAssociation.managerName || null,
              registrationNumber: ownerAssociation.registrationNumber || null,
              registeredUnitsCount: ownerAssociation.registeredUnitsCount || null,
              iban: ownerAssociation.iban || null,
              accountNumber: ownerAssociation.accountNumber || null,
              contactNumber: ownerAssociation.contactNumber || null,
              startDate: ownerAssociation.startDate || null,
              endDate: ownerAssociation.endDate || null,
              monthlyFee: ownerAssociation.monthlyFee || null,
              includesElectricity: ownerAssociation.includesElectricity || false,
              includesWater: ownerAssociation.includesWater || false,
            } : null,
            
            // معلومات المالك - Owner Info
            owner_id: user.id,
          }
        ])
        .select()
        .single()

      if (buildingError) {
        console.error('❌ خطأ في حفظ العمارة:', buildingError)
        throw new Error(`فشل حفظ العمارة: ${buildingError.message}`)
      }

      console.log('✅ تم حفظ العمارة بنجاح - ID:', building.id)

      // ==========================================
      // 4️⃣ رفع الصور (إن وجدت)
      // Upload Images (if any)
      // ==========================================
      if (images.length > 0) {
        console.log(`📸 بدء رفع ${images.length} صورة...`)
        
        try {
          const imageUrls = await uploadImages(building.id)
          
          const { error: updateError } = await supabase
            .from('buildings')
            .update({ image_urls: imageUrls })
            .eq('id', building.id)

          if (updateError) {
            console.error('⚠️ خطأ في تحديث روابط الصور:', updateError)
            throw new Error(`فشل حفظ الصور: ${updateError.message}`)
          }
          
          console.log(`✅ تم رفع ${imageUrls.length} صورة بنجاح`)
        } catch (uploadError: any) {
          console.error('❌ خطأ في رفع الصور:', uploadError)
          // لا نوقف العملية، فقط ننبه
          console.warn('⚠️ تم حفظ العمارة لكن فشل رفع الصور')
        }
      }

      // ==========================================
      // 5️⃣ حفظ الوحدات السكنية برقم متسلسل مضمون
      // Save Units with Guaranteed Sequential Numbering
      // جميع الوحدات محفوظة برقم متسلسل من 1 إلى N
      // All units saved with sequential numbers from 1 to N
      // ==========================================
      if (totalUnits > 0) {
        console.log(`🏢 بدء حفظ ${totalUnits} وحدة سكنية برقم متسلسل مضمون...`)
        
        let savedUnitsCount = 0
        
        for (const floor of floorsWithSequentialNumbers) {
          for (const unit of floor.units) {
            console.log(`  📝 حفظ وحدة رقم: ${unit.unitNumber} في الدور ${floor.number}`)
            
            const { error: unitError } = await supabase
              .from('units')
              .insert([
                {
                  building_id: building.id,
                  unit_number: unit.unitNumber,                    // ✅ متسلسل: "1", "2", "3", ...
                  floor: floor.number,
                  type: unit.type || 'apartment',
                  facing: unit.facing || 'front',
                  area: unit.area || 0,
                  rooms: unit.rooms || 1,
                  bathrooms: unit.bathrooms || 1,
                  living_rooms: unit.livingRooms || 1,
                  kitchens: unit.kitchens || 1,
                  maid_room: unit.maidRoom || false,
                  driver_room: unit.driverRoom || false,
                  entrances: unit.entrances ?? 1,
                  ac_type: unit.acType || 'split',
                  status: unit.status || 'available',
                  price: unit.price || null,
                  description: unit.description || null
                }
              ])

            if (unitError) {
              console.error(`❌ خطأ في حفظ الوحدة ${unit.unitNumber}:`, unitError)
              
              // إذا كانت المشكلة في RLS policies
              if (unitError.message.includes('row-level security')) {
                throw new Error('خطأ: صلاحيات قاعدة البيانات غير مكتملة. يرجى تطبيق fix_units_policies.sql في Supabase')
              }
              
              throw new Error(`فشل حفظ الوحدة ${unit.unitNumber}: ${unitError.message}`)
            }
            
            savedUnitsCount++
            console.log(`  ✅ تم حفظ الوحدة ${unit.unitNumber} بنجاح`)
          }
        }
        
        console.log(`🎯 ملخص الحفظ: تم حفظ ${savedUnitsCount} وحدة سكنية برقم متسلسل صحيح (1 إلى ${savedUnitsCount})`)
      } else {
        console.log('ℹ️ لا توجد وحدات لحفظها')
      }

      // ==========================================
      // 6️⃣ النجاح - Success
      // ==========================================
      console.log('🎉 اكتمل حفظ البيانات بنجاح مع تطبيق سياسة الترقيم المتسلسل')
      setSuccess('تم إضافة العمارة والوحدات بنجاح برقم متسلسل مضمون!')
      
      setTimeout(() => {
        router.push('/dashboard/buildings')
        router.refresh()
      }, 2000)
      
    } catch (error: any) {
      console.error('❌ خطأ عام في حفظ البيانات:', error)
      
      // رسائل خطأ مفصلة
      let errorMessage = error.message || 'حدث خطأ غير متوقع'
      
      // أخطاء شائعة مع حلول
      if (errorMessage.includes('Could not find')) {
        errorMessage += '\n\n💡 الحل: قد يكون العمود غير موجود في قاعدة البيانات. راجع COMPLETE_SAVE_GUIDE.md'
      } else if (errorMessage.includes('row-level security')) {
        errorMessage += '\n\n💡 الحل: نفّذ fix_units_policies.sql في Supabase SQL Editor'
      } else if (errorMessage.includes('duplicate key')) {
        errorMessage += '\n\n💡 الحل: تم تحديث كود توليد أرقام الوحدات ليكون تلقائياً (رقم_الدور-رقم_الوحدة). حاول إضافة إدارة حقول الوحدات من جديد أو تحديث أرقامها يدوياً لتكون فريدة تماماً'
      } else if (errorMessage.includes('violates not-null')) {
        errorMessage += '\n\n💡 الحل: حقل مطلوب فارغ. تأكد من ملء اسم العمارة واسم المالك ورقم القطعة'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'معلومات العمارة', icon: Building2, description: 'البيانات الأساسية' },
    { number: 2, title: 'تفاصيل العمارة', icon: Home, description: 'الادوار والمواقف والواجهة' },
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
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-5">
              {/* زر الرجوع إلى لوحة التحكم */}
              <Link href="/dashboard" className="inline-flex items-center justify-center p-2.5 rounded-2xl hover:bg-indigo-50 transition-all duration-300 group" title="رجوع إلى لوحة التحكم">
                <span className="w-11 h-11 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </span>
              </Link>

              {/* اللوقو والنصوص */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 animate-pulse">
                  <Building2 className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    إضافة عمارة جديدة
                  </h1>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                    أدخل جميع تفاصيل العمارة والوحدات السكنية بطريقة سهلة وسريعة
                  </p>
                </div>
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/buildings"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transform transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
              >
                <Building2 className="w-5 h-5 text-white" />
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
                  style={{ left: `${trackLeftPx + 20}px`, width: `${trackTotalPx - 45}px` }}
                />

                {/* fill measured */}
                <div
                  className="h-2 rounded-full absolute top-6 bg-gradient-to-l from-green-400 to-emerald-500 transition-all duration-500 ease-in-out"
                  style={{
                    left: `${isRTL ? trackLeftPx + 20 + ((trackTotalPx - 45) - (progressPercent / 100) * (trackTotalPx - 45)) : trackLeftPx + 20}px`,
                    width: `${(progressPercent / 100) * (trackTotalPx - 45)}px`,
                  }}
                />
              </>
            ) : (
              <>
                <div
                  className="h-2 rounded-full absolute top-6 bg-gradient-to-l from-emerald-100 via-emerald-50 to-emerald-200"
                  style={{ left: '20px', right: '25px' }}
                />

                {/* fill fallback (percentage of container) */}
                <div
                  className="h-2 rounded-full absolute top-6 bg-gradient-to-l from-green-400 to-emerald-500 transition-all duration-500 ease-in-out"
                  style={isRTL ? { right: '25px', width: `calc((100% - 45px) * ${progressPercent / 100})` } : { left: '20px', width: `calc((100% - 45px) * ${progressPercent / 100})` }}
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
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition text-lg"
                        placeholder="مثال: عمارة النخيل"
                      />
                    </div>
                  </div>

                  {/* اسم المالك */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      اسم المالك <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                        required
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition text-lg"
                        placeholder="مثال: مؤسسة أحمد العتيبي"
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
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
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
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
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
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
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
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none group-focus-within:text-indigo-500 transition">
                        <ChevronDown className="w-5 h-5 text-gray-500 group-focus-within:text-indigo-500 animate-bounce" style={{animationDuration: '0.6s'}} />
                      </div>
                      <select
                        value={formData.buildStatus}
                        onChange={(e) => setFormData({...formData, buildStatus: e.target.value as any})}
                        required
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition appearance-none text-gray-700 cursor-pointer"
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
                        onChange={(e) => setFormData({...formData, landArea: parseInt(e.target.value) || 0})}
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                        placeholder="مثال: 500"
                      />
                    </div>
                  </div>

                      مساحة الأرض (م²)
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition">
                        <Ruler className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        value={formData.landArea || ''}
                        onChange={(e) => setFormData({...formData, landArea: parseInt(e.target.value) || 0})}
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                        placeholder="مثال: 500"
                      />
                    </div>
                  </div>

                  {/* رقم الصك */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      رقم الصك <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition">
                        <FileText className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={formData.deedNumber}
                        onChange={(e) => setFormData({...formData, deedNumber: e.target.value})}
                        required
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                        placeholder="مثال: 123456789"
                      />
                    </div>
                  </div>

                  {/* رقم رخصة البناء + وصف العمارة (حقلين جنب بعض - أعلى) */}
                  <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                          placeholder="مثال: 12345/2023"
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
                        onChange={(e) => setFormData({...formData, landArea: parseInt(e.target.value) || 0})}
                        className="w-full pr-14 pl-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                        placeholder="مثال: 500"
                      />
                    </div>
                  </div>

                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        وصف العمارة
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={2}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition text-sm resize-y min-h-[60px]"
                        placeholder="اكتب وصفاً موجزاً للعمارة..."
                      />
                    </div>
                  </div>

                  {/* التأمين - الكهرباء - المياه (أسفل الحقلين) */}
                  <div className="col-span-2">
                    <div className="space-y-4">
                      {/* حالة التأمين */}
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm font-semibold text-gray-700 shrink-0">هل يوجد تأمين على المبنى</label>
                        <div className="flex gap-4 shrink-0">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" value="yes" checked={formData.insuranceAvailable === true} onChange={() => setFormData({...formData, insuranceAvailable: true})} className="w-4 h-4 accent-indigo-500" />
                            <span className="text-gray-700">نعم</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" value="no" checked={formData.insuranceAvailable === false} onChange={() => setFormData({...formData, insuranceAvailable: false, insurancePolicyNumber: ''})} className="w-4 h-4 accent-indigo-500" />
                            <span className="text-gray-700">لا</span>
                          </label>
                        </div>
                        {formData.insuranceAvailable && (
                  {/* الوصف */}
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      وصف العمارة
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                      placeholder="اكتب وصفاً للعمارة..."
                    />
                  </div>
                          <div className="flex-1 min-w-[180px] animate-fadeIn">
                            <div className="relative group">
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Shield className="w-4 h-4" /></div>
                              <input type="text" value={formData.insurancePolicyNumber} onChange={(e) => setFormData({...formData, insurancePolicyNumber: e.target.value})} required={formData.insuranceAvailable} className="w-full pr-10 pl-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100" placeholder="رقم البوليصة *" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* عداد الكهرباء الرئيسي */}
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm font-semibold text-gray-700 shrink-0">هل يوجد عداد كهرباء رئيسي</label>
                        <div className="flex gap-4 shrink-0">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" value="yes" checked={formData.hasMainElectricityMeter === true} onChange={() => setFormData({...formData, hasMainElectricityMeter: true})} className="w-4 h-4 accent-indigo-500" />
                            <span className="text-gray-700">نعم</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" value="no" checked={formData.hasMainElectricityMeter === false} onChange={() => setFormData({...formData, hasMainElectricityMeter: false, electricityMeterNumber: ''})} className="w-4 h-4 accent-indigo-500" />
                            <span className="text-gray-700">لا</span>
                          </label>
                        </div>
                        {formData.hasMainElectricityMeter && (
                          <div className="flex-1 min-w-[180px] animate-fadeIn">
                            <div className="relative group">
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Zap className="w-4 h-4" /></div>
                              <input type="text" value={formData.electricityMeterNumber} onChange={(e) => setFormData({...formData, electricityMeterNumber: e.target.value})} className="w-full pr-10 pl-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100" placeholder="رقم العداد" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* عداد المياه الرئيسي */}
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm font-semibold text-gray-700 shrink-0">هل يوجد عداد مياه رئيسي</label>
                        <div className="flex gap-4 shrink-0">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" value="yes" checked={formData.hasMainWaterMeter === true} onChange={() => setFormData({...formData, hasMainWaterMeter: true})} className="w-4 h-4 accent-indigo-500" />
                            <span className="text-gray-700">نعم</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" value="no" checked={formData.hasMainWaterMeter === false} onChange={() => setFormData({...formData, hasMainWaterMeter: false, waterMeterNumber: ''})} className="w-4 h-4 accent-indigo-500" />
                            <span className="text-gray-700">لا</span>
                          </label>
                        </div>
                        {formData.hasMainWaterMeter && (
                          <div className="flex-1 min-w-[180px] animate-fadeIn">
                            <div className="relative group">
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Hash className="w-4 h-4" /></div>
                              <input type="text" value={formData.waterMeterNumber} onChange={(e) => setFormData({...formData, waterMeterNumber: e.target.value})} className="w-full pr-10 pl-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100" placeholder="رقم العداد" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Step 2: تفاصيل العمارة */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="border-t-4 border-emerald-400/40 pt-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-400/80 to-teal-400/80 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-400/20 backdrop-blur-sm">
                      <Home className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-700">تفاصيل العمارة</h2>
                      <p className="text-xs text-gray-500/80">المواقف - الواجهة - المصاعد</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* عدد الأدوار مع نظام الدور */}
                  <div className="col-span-1">
                    <label className="block text-sm font-semibold text-gray-600 mb-3">
                      عدد الأدوار
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-400/60 group-focus-within:text-emerald-500 transition">
                        <Layers className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        value={formData.totalFloors}
                        onChange={(e) => {
                          const newTotal = parseInt(e.target.value) || 1;
                          setFormData({...formData, totalFloors: newTotal});
                          // إعادة بناء الأدوار بناءً على القيمتين الجديدتين
                          const newFloors = [];
                          let unitCounter = 1;
                          for (let i = 1; i <= newTotal; i++) {
                            const newUnits: Unit[] = [];
                            for (let j = 0; j < formData.unitsPerFloor; j++) {
                              newUnits.push({
                                unitNumber: `${unitCounter++}`,
                                floor: i,
                                type: 'apartment',
                                facing: 'front',
                                area: 0,
                                rooms: 1,
                                bathrooms: 1,
                                livingRooms: 1,
                                kitchens: 1,
                                maidRoom: false,
                                driverRoom: false,
                                entrances: 1,
                                acType: 'split',
                                status: 'available',
                                price: 0
                              });
                            }
                            newFloors.push({
                              number: i,
                              units: newUnits,
                              floorPlan: (formData.unitsPerFloor === 4 ? '4shuqq' : formData.unitsPerFloor === 3 ? '3shuqq' : '2shuqq') as '4shuqq' | '3shuqq' | '2shuqq' | 'custom',
                              unitsPerFloor: formData.unitsPerFloor
                            });
                          }
                          setFloors(newFloors as Floor[]);
                        }}
                        min="1"
                        className="w-full pr-14 pl-4 py-4 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  {/* عدد الشقق في الدور */}
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-600 mb-3">
                      عدد الشقق في الدور
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-400/60 group-focus-within:text-emerald-500 transition pointer-events-none">
                        <Grid className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={formData.unitsPerFloor || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 1;
                          setFormData(prev => ({ ...prev, unitsPerFloor: val }));
                        }}
                        className="w-full pr-14 pl-4 py-4 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  {/* عدد مواقف السيارات */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-3">
                      عدد مواقف السيارات
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-400/60 group-focus-within:text-emerald-500 transition">
                        <ParkingCircle className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        value={formData.parkingSlots}
                        onChange={(e) => setFormData({...formData, parkingSlots: parseInt(e.target.value) || 0})}
                        min="0"
                        className="w-full pr-14 pl-4 py-4 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  {/* عدد غرف السائقين */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-3">
                      عدد غرف السائقين
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-400/60 group-focus-within:text-emerald-500 transition">
                        <Bed className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        value={formData.driverRooms}
                        onChange={(e) => setFormData({...formData, driverRooms: parseInt(e.target.value) || 0})}
                        min="0"
                        className="w-full pr-14 pl-4 py-4 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  {/* عدد المصاعد */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-3">
                      عدد المصاعد
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-400/60 group-focus-within:text-emerald-500 transition">
                        <ArrowUp className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        value={formData.elevators}
                        onChange={(e) => setFormData({...formData, elevators: parseInt(e.target.value) || 1})}
                        min="0"
                        className="w-full pr-14 pl-4 py-4 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  {/* واجهة العمارة */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-3">
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
                          className={`py-4 px-3 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-md shadow-sm hover:shadow-md ${
                            formData.streetType === option.value
                              ? 'bg-emerald-100/60 border-emerald-400/60 text-emerald-700'
                              : 'bg-white/50 border-emerald-200/30 hover:border-emerald-300/50 text-gray-600'
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
                    <label className="block text-sm font-semibold text-gray-600 mb-3">
                      اتجاه العمارة
                    </label>
                    <div className="relative group">
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-400/60 group-focus-within:text-emerald-500 transition pointer-events-none">
                        <Compass className="w-5 h-5" />
                      </div>
                      <select
                        value={formData.buildingFacing}
                        onChange={(e) => setFormData({...formData, buildingFacing: e.target.value as any})}
                        className="w-full pr-14 pl-4 py-4 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition appearance-none text-gray-700 font-medium shadow-sm hover:shadow-md"
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



                </div>
              </div>
            )}

            {/* Step 3: الوحدات السكنية - تصميم محسّن */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="border-t-4 border-emerald-400/40 pt-6 rounded-t-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-400/80 to-teal-400/80 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-400/20 backdrop-blur-sm">
                        <Grid className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-700">الوحدات السكنية</h2>
                        <p className="text-xs text-gray-500/80 flex items-center gap-2 mt-1">
                          <Sparkles className="w-3 h-3 text-emerald-500/70" />
                          أضف وحدات دقيقة مع جميع التفاصيل بشكل سريع وسهل
                        </p>
                      </div>
                    </div>

                    {/* Quick Add Button - إضافة سريعة */}
                    <button
                      type="button"
                      onClick={quickAddUnits}
                      className="group relative inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500/90 to-teal-500/90 text-white rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-105 overflow-hidden backdrop-blur-sm"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      <Zap className="w-4 h-4 relative z-10 group-hover:rotate-12 transition-transform" />
                      <span className="relative z-10 font-semibold text-sm">تطبيق الدور الأول على المكرر</span>
                      <Sparkles className="w-3 h-3 relative z-10" />
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50/50 via-teal-50/50 to-cyan-50/50 border-2 border-emerald-200/30 rounded-2xl p-6 mb-6 shadow-sm hover:shadow-md transition-shadow backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-emerald-900">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-400/80 to-teal-400/80 rounded-2xl flex items-center justify-center shadow-md">
                        <Info className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-bold flex items-center gap-2">
                          <span className="text-3xl text-emerald-700">{floors.reduce((sum, floor) => sum + floor.units.length, 0)}</span>
                          <span className="text-gray-600">وحدة إجمالاً</span>
                        </p>
                        <p className="text-xs text-emerald-600/80 mt-1">موزعة على {floors.length} {floors.length === 1 ? 'دور' : 'أدوار'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {floors.map((floor) => (
                  <div key={floor.number} className="border-2 border-emerald-200/30 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-500 backdrop-blur-sm">
                    {/* رأس الدور - النقر في أي مكان يفتح/يطوي */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedFloor(expandedFloor === floor.number ? null : floor.number)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedFloor(expandedFloor === floor.number ? null : floor.number); } }}
                      className="bg-gradient-to-r from-green-100/30 via-emerald-100/30 to-teal-100/30 text-slate-800 p-6 hover:from-green-100/40 hover:via-emerald-100/40 hover:to-teal-100/40 transition-all duration-300 relative overflow-hidden group backdrop-blur-md cursor-pointer select-none"
                    >
                      {/* Animated Background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                          <Layers className="w-7 h-7 text-slate-800" />
                          <div>
                            <h3 className="font-bold text-xl">الدور {floor.number}</h3>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-sm bg-white/20 backdrop-blur px-4 py-1.5 rounded-full font-medium shadow-sm">
                                {floor.units.length} {floor.units.length === 1 ? 'وحدة' : 'وحدات'}
                              </span>
                              <span className="text-sm text-slate-800 font-medium">
                                نظام: {
                                  (() => {
                                    const n = floor.units.length;
                                    if (n === 1) return 'شقة واحدة';
                                    if (n === 2) return 'شقتين';
                                    return `${n} شقق`;
                                  })()
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFloor(floor.number)
                            }}
                            className="group/btn flex flex-col items-center gap-1 p-2 text-slate-800 rounded-2xl hover:bg-white/20 transition-all hover:scale-110"
                            title="حذف الدور"
                          >
                            <Trash2 className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                            <span className="text-xs font-medium">حذف</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedFloor(expandedFloor === floor.number ? null : floor.number)
                            }}
                            className="flex flex-col items-center gap-1 p-2 text-slate-800 rounded-2xl hover:bg-white/20 transition-all hover:scale-110 cursor-pointer"
                          >
                            {expandedFloor === floor.number ? 
                              <ChevronUp className="w-5 h-5 transition-transform duration-300" /> : 
                              <ChevronDown className="w-5 h-5 transition-transform duration-300" />
                            }
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* وحدات الدور - طريقة عرض محسّنة */}
                    {expandedFloor === floor.number && (
                      <div className="p-6 space-y-5 bg-gray-50/50">
                        {floor.units.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 bg-white/50 rounded-2xl border-2 border-dashed border-emerald-200/50 backdrop-blur-sm">
                            <Home className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium mb-4">لا توجد وحدات في هذا الدور</p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                addUnit(floor.number)
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400/80 to-emerald-400/80 text-white font-medium rounded-xl hover:shadow-lg transition-all hover:scale-105 backdrop-blur-sm border border-green-300/50"
                            >
                              <Plus className="w-5 h-5" />
                              إضافة وحدة
                            </button>
                          </div>
                        ) : (
                          floor.units.map((unit, unitIndex) => (
                          <div key={unitIndex} className="bg-white/70 backdrop-blur-sm rounded-2xl border-2 border-emerald-200/30 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                            {/* رأس الوحدة - النقر في أي مكان يفتح/يطوي التفاصيل */}
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setExpandedUnit(expandedUnit === `${floor.number}-${unitIndex}` ? null : `${floor.number}-${unitIndex}`)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedUnit(expandedUnit === `${floor.number}-${unitIndex}` ? null : `${floor.number}-${unitIndex}`); } }}
                              className="bg-gradient-to-r from-emerald-50/60 to-teal-50/60 border-b-2 border-emerald-200/30 p-5 flex items-center justify-between backdrop-blur-sm cursor-pointer hover:from-emerald-100/70 hover:to-teal-100/70 transition-colors select-none"
                            >
                              <div className="flex items-center gap-4">
                                <Home className="w-6 h-6 text-emerald-600/80" />
                                <div>
                                  <h4 className="font-bold text-gray-700 text-lg">الوحدة {unit.unitNumber}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs bg-blue-100/70 backdrop-blur-sm text-blue-700 px-2 py-1 rounded-full font-medium">
                                      {unit.type === 'apartment' ? 'شقة' : unit.type === 'studio' ? 'ملحق' : unit.type === 'duplex' ? 'دوبلكس' : 'بنتهاوس'}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm ${
                                      unit.status === 'available' ? 'bg-green-100/70 text-green-700' :
                                      unit.status === 'reserved' ? 'bg-yellow-100/70 text-yellow-700' :
                                      'bg-red-100/70 text-red-700'
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
                                    addUnit(floor.number)
                                  }}
                                  className="p-2 text-green-600 rounded-2xl hover:bg-green-100/50 transition-all hover:scale-110"
                                  title="إضافة وحدة"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeUnit(floor.number, unitIndex)
                                  }}
                                  className="p-2 text-red-600 rounded-2xl hover:bg-red-100/50 transition-all hover:scale-110"
                                  title="حذف الوحدة"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedUnit(expandedUnit === `${floor.number}-${unitIndex}` ? null : `${floor.number}-${unitIndex}`)
                                  }}
                                  className="p-2 text-gray-600 rounded-2xl hover:bg-gray-200/50 transition-all"
                                >
                                  {expandedUnit === `${floor.number}-${unitIndex}` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {/* ملخص سريع - صف واحد */}
                            <div className="p-4 bg-white grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-gray-100">
                              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-2xl hover:bg-gray-50 transition-colors border border-gray-200 min-h-[4.5rem]">
                                <Maximize className="w-4 h-4 text-gray-600 mb-1 flex-shrink-0" />
                                <span className="text-xs text-gray-600 font-medium">المساحة</span>
                                <span className="text-sm font-bold text-gray-700">{unit.area || '—'} م²</span>
                              </div>
                              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-2xl hover:bg-gray-50 transition-colors border border-gray-200 min-h-[4.5rem]">
                                <span className="inline-flex items-center justify-center w-4 h-4 text-[15px] font-medium text-gray-600 mb-1 flex-shrink-0" title="الريال السعودي">&#x20C1;</span>
                                <span className="text-xs text-gray-600 font-medium">السعر</span>
                                <span className="text-sm font-bold text-gray-700">{unit.price ? unit.price.toLocaleString() : '—'} ر.س</span>
                              </div>
                              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-2xl hover:bg-gray-50 transition-colors border border-gray-200 min-h-[4.5rem]">
                                <Bed className="w-4 h-4 text-gray-600 mb-1 flex-shrink-0" />
                                <span className="text-xs text-gray-600 font-medium">الغرف</span>
                                <span className="text-sm font-bold text-gray-700">{unit.rooms}</span>
                              </div>
                              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-2xl hover:bg-gray-50 transition-colors border border-gray-200 min-h-[4.5rem]">
                                <Bath className="w-4 h-4 text-gray-600 mb-1 flex-shrink-0" />
                                <span className="text-xs text-gray-600 font-medium">الحمامات</span>
                                <span className="text-sm font-bold text-gray-700">{unit.bathrooms}</span>
                              </div>
                            </div>

                            {/* التفاصيل المdéveloppées */}
                            {expandedUnit === `${floor.number}-${unitIndex}` && (
                              <div className="p-6 bg-gradient-to-b from-white to-gray-50 space-y-6 border-t-2 border-gray-200">
                                {/* الصف الأول - المعلومات الأساسية */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-600 flex items-center gap-1">
                                      <Maximize className="w-4 h-4 text-blue-500/70" />
                                      المساحة (م²)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={unit.area}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { area: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-semibold text-sm shadow-sm hover:shadow-md"
                                      placeholder="0.00"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-600 flex items-center gap-1">
                                      <span className="text-sm font-bold text-green-500/70" title="الريال السعودي">&#x20C1;</span>
                                      السعر (ر.س)
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={unit.price ? formatPriceWithCommas(unit.price) : ''}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { price: parsePriceInput(e.target.value) })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-semibold text-sm shadow-sm hover:shadow-md"
                                      placeholder="0"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-600 flex items-center gap-1">
                                      <Tag className="w-4 h-4 text-purple-500/70" />
                                      نوع الوحدة
                                    </label>
                                    <select
                                      value={unit.type}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { type: e.target.value as any })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-medium text-sm shadow-sm hover:shadow-md"
                                    >
                                      <option value="apartment">شقة</option>
                                      <option value="studio">ملحق</option>
                                      <option value="duplex">دوبلكس</option>
                                      <option value="penthouse">بنتهاوس</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-600 flex items-center gap-1">
                                      <Compass className="w-4 h-4 text-blue-500/70" />
                                      اتجاه الوحدة
                                    </label>
                                    <select
                                      value={unit.facing}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { facing: e.target.value as any })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-medium text-sm shadow-sm hover:shadow-md"
                                    >
                                      <option value="front">أمامية</option>
                                      <option value="back">خلفية</option>
                                      <option value="corner">على شارعين</option>
                                    </select>
                                  </div>
                                </div>

                                {/* الصف الثاني - الغرف والحمامات */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-600 flex items-center gap-2">
                                      <Bed className="w-4 h-4 text-red-500/70" />
                                      عدد الغرف
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={unit.rooms}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { rooms: parseInt(e.target.value) || 0 })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-semibold text-sm shadow-sm hover:shadow-md"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-600 flex items-center gap-2">
                                      <Bath className="w-4 h-4 text-cyan-500/70" />
                                      عدد الحمامات
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={unit.bathrooms}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { bathrooms: parseInt(e.target.value) || 0 })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-semibold text-sm shadow-sm hover:shadow-md"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-600 flex items-center gap-2">
                                      <Sofa className="w-4 h-4 text-amber-500/70" />
                                      صالات
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={unit.livingRooms}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { livingRooms: parseInt(e.target.value) || 0 })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-semibold text-sm shadow-sm hover:shadow-md"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-600 flex items-center gap-2">
                                      <UtensilsCrossed className="w-4 h-4 text-orange-500/70" />
                                      مطابخ
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={unit.kitchens}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { kitchens: parseInt(e.target.value) || 0 })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-semibold text-sm shadow-sm hover:shadow-md"
                                    />
                                  </div>
                                </div>

                                {/* الصف الثالث - الغرف الإضافية والتكييف والمداخل */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-600 flex items-center gap-2">
                                      <DoorOpen className="w-4 h-4 text-emerald-500/70" />
                                      عدد المداخل
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={unit.entrances ?? 1}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { entrances: parseInt(e.target.value, 10) || 1 })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-semibold text-sm shadow-sm hover:shadow-md"
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-600 flex items-center gap-2">
                                      <User className="w-4 h-4 text-indigo-500/70" />
                                      غرفة خادمة
                                    </label>
                                    <select
                                      value={unit.maidRoom ? 'yes' : 'no'}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { maidRoom: e.target.value === 'yes' })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-medium shadow-sm hover:shadow-md"
                                    >
                                      <option value="no">لا يوجد</option>
                                      <option value="yes">يوجد</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-600 flex items-center gap-2">
                                      <User className="w-4 h-4 text-pink-500/70" />
                                      غرفة سائق
                                    </label>
                                    <select
                                      value={unit.driverRoom ? 'yes' : 'no'}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { driverRoom: e.target.value === 'yes' })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-medium shadow-sm hover:shadow-md"
                                    >
                                      <option value="no">لا يوجد</option>
                                      <option value="yes">يوجد</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-600 flex items-center gap-2">
                                      <Wind className="w-4 h-4 text-sky-500/70" />
                                      التكييف
                                    </label>
                                    <select
                                      value={unit.acType}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { acType: e.target.value as any })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-medium shadow-sm hover:shadow-md"
                                    >
                                      <option value="split">سبلت</option>
                                      <option value="window">شباك</option>
                                      <option value="splitWindow">سبلت + شباك</option>
                                      <option value="central">مركزي</option>
                                      <option value="none">لا يوجد</option>
                                    </select>
                                  </div>
                                </div>

                                {/* الصف الرابع - الوصف (حالة الوحدة: متاح افتراضياً عند الإضافة) */}
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-600 flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-slate-500/70" />
                                      الوصف
                                    </label>
                                    <input
                                      type="text"
                                      value={unit.description || ''}
                                      onChange={(e) => updateUnit(floor.number, unitIndex, { description: e.target.value })}
                                      className="w-full px-3 py-2.5 bg-white/70 backdrop-blur-md border-2 border-emerald-200/30 rounded-2xl focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-100/40 outline-none transition font-medium shadow-sm hover:shadow-md"
                                      placeholder="وصف اختياري للوحدة..."
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                        )}
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
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center group-hover:scale-125 group-hover:shadow-lg transition-transform">
                      <Plus className="w-7 h-7 text-indigo-600 group-hover:text-indigo-700" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-gray-700 group-hover:text-indigo-700 block">إضافة دور جديد</span>
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
                      <h2 className="text-2xl font-bold text-gray-800">معلومات الحارس والموقع</h2>
                      <p className="text-xs text-gray-500">بيانات الحارس والموقع</p>
                    </div>
                  </div>
                </div>

                {/* معلومات الحارس */}
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 border-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-semibold text-gray-800">معلومات الحارس</h3>
                  </div>

                  <div className="space-y-4">
                    {/* الصف الأول: البيانات الأساسية (3 أعمدة) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* الخانة 1: اسم الحارس */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">اسم الحارس</label>
                        <div className="relative group">
                          <User className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={formData.guardName}
                            onChange={(e) => setFormData({...formData, guardName: e.target.value})}
                            className="w-full pr-12 pl-4 py-2.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-blue-500 outline-none"
                            placeholder="اسم الحارس"
                          />
                        </div>
                      </div>

                      {/* الخانة 2: رقم جوال الحارس */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">رقم جوال الحارس</label>
                        <div className="relative group">
                          <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="tel"
                            value={formData.guardPhone}
                            onChange={(e) => setFormData({...formData, guardPhone: e.target.value})}
                            className="w-full pr-12 pl-4 py-2.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-blue-500 outline-none"
                            placeholder="05xxxxxxxx"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      {/* الخانة 3: رقم الغرفة */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">رقم الغرفة</label>
                        <input
                          type="text"
                          value={formData.guardRoomNumber}
                          onChange={(e) => setFormData({...formData, guardRoomNumber: e.target.value})}
                          className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-blue-500 outline-none"
                          placeholder="رقم الغرفة"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* الصف الثاني: فترة العمل + الراتب (عمود واحد) + عرض صورة الهوية */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* العمود الأول: فترة العمل + الراتب */}
                      <div className="space-y-3">
                        {/* فترة العمل */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">فترة العمل</label>
                          <select
                            value={formData.guardShift}
                            onChange={(e) => setFormData({...formData, guardShift: e.target.value as any})}
                            className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-blue-500 outline-none"
                          >
                            <option value="day">صباحي</option>
                            <option value="night">مسائي</option>
                            <option value="permanent">دائم</option>
                          </select>
                        </div>

                        {/* خانة الراتب */}
                        <label className="flex items-center justify-start gap-3 p-3 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-400 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            id="hasSalary"
                            checked={formData.hasSalary}
                            onChange={(e) => setFormData({...formData, hasSalary: e.target.checked, salaryAmount: e.target.checked ? formData.salaryAmount : 0})}
                            className="w-5 h-5 text-blue-600 rounded cursor-pointer flex-shrink-0"
                          />
                          <span className="text-sm font-medium text-gray-700">يوجد راتب</span>
                        </label>

                        {/* مبلغ الراتب (يظهر عند التفعيل) */}
                        {formData.hasSalary && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">مبلغ الراتب</label>
                            <div className="relative group">
                              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-500 font-semibold text-sm">ر.س</span>
                              <input
                                type="number"
                                value={formData.salaryAmount}
                                onChange={(e) => setFormData({...formData, salaryAmount: parseFloat(e.target.value) || 0})}
                                className="w-full pr-12 pl-4 py-2.5 bg-white border-2 border-blue-300 rounded-2xl focus:border-blue-500 outline-none font-semibold text-gray-700"
                                placeholder="0"
                                dir="ltr"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* العمود الثاني: عرض صورة الهوية */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">صورة الهوية</label>
                        <div className="flex items-center justify-center h-[12.5rem] bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                          {formData.guardIdPhoto ? (
                            <img
                              src={formData.guardIdPhoto}
                              alt="صورة الهوية"
                              className="w-full h-full object-cover"
                              style={{ width: '324px', height: '204px' }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Camera className="w-8 h-8 text-gray-300" />
                              <span className="text-xs text-gray-400">اختر صورة</span>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                setFormData({...formData, guardIdPhoto: event.target?.result as string})
                              }
                              reader.readAsDataURL(e.target.files[0])
                            }
                          }}
                          className="hidden"
                          id="guardIdPhotoInput"
                        />
                        <label
                          htmlFor="guardIdPhotoInput"
                          className="mt-2 block w-full py-2 px-4 text-center text-sm font-medium text-blue-600 bg-blue-50 border-2 border-blue-200 rounded-2xl hover:bg-blue-100 cursor-pointer transition-colors"
                        >
                          رفع الصورة
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* الموقع */}
                <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-2xl p-8 border-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-6 h-6 text-emerald-600" />
                    <h3 className="text-xl font-semibold text-gray-800">الموقع على الخريطة</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">رابط خرائط Google</label>
                      <input
                        type="url"
                        value={formData.googleMapsLink}
                        onChange={(e) => setFormData({...formData, googleMapsLink: e.target.value})}
                        className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-emerald-500 outline-none"
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
                      <div className="relative w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:bg-amber-600 transition-colors">
                        <div className={`absolute top-0.5 right-0.5 bg-white border border-gray-300 rounded-full h-6 w-6 transition-transform ${ownerAssociation.hasAssociation ? 'translate-x-[-28px]' : 'translate-x-0'}`}></div>
                      </div>
                      <span className="mr-4 text-sm font-medium text-gray-700">
                        {ownerAssociation.hasAssociation ? 'يوجد اتحاد ملاك' : 'لا يوجد اتحاد ملاك'}
                      </span>
                    </label>
                  </div>

                  {ownerAssociation.hasAssociation && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 animate-fadeIn">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">اسم مسؤول الاتحاد</label>
                        <input
                          type="text"
                          value={ownerAssociation.managerName}
                          onChange={(e) => setOwnerAssociation({ ...ownerAssociation, managerName: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-amber-500 outline-none"
                          placeholder="اسم مسؤول الاتحاد"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">رقم سجل الاتحاد</label>
                        <input
                          type="text"
                          value={ownerAssociation.registrationNumber}
                          onChange={(e) => setOwnerAssociation({ ...ownerAssociation, registrationNumber: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-amber-500 outline-none"
                          placeholder="رقم سجل الاتحاد"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">رقم الحساب</label>
                        <input
                          type="text"
                          value={ownerAssociation.accountNumber}
                          onChange={(e) => setOwnerAssociation({ ...ownerAssociation, accountNumber: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-amber-500 outline-none"
                          placeholder="رقم الحساب البنكي"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">رقم الآيبان (IBAN)</label>
                        <input
                          type="text"
                          value={ownerAssociation.iban}
                          onChange={(e) => setOwnerAssociation({ ...ownerAssociation, iban: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-amber-500 outline-none"
                          placeholder="SA0000000000000000000000"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">رقم التواصل</label>
                        <div className="relative group">
                          <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="tel"
                            value={ownerAssociation.contactNumber}
                            onChange={(e) => setOwnerAssociation({ ...ownerAssociation, contactNumber: e.target.value })}
                            className="w-full pr-12 pl-4 py-2.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-amber-500 outline-none"
                            placeholder="05xxxxxxxx"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">عدد الوحدات المسجلة بالاتحاد</label>
                        <input
                          type="number"
                          value={ownerAssociation.registeredUnitsCount}
                          onChange={(e) => setOwnerAssociation({ ...ownerAssociation, registeredUnitsCount: parseInt(e.target.value) || 0 })}
                          min="0"
                          className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-amber-500 outline-none"
                          placeholder="عدد الوحدات"
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
                            className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:border-amber-500 outline-none"
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
                            className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:border-amber-500 outline-none"
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
                            className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:border-amber-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">الرسوم تشمل</label>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ownerAssociation.includesElectricity}
                              onChange={(e) => setOwnerAssociation({ ...ownerAssociation, includesElectricity: e.target.checked })}
                              className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">فواتير الكهرباء</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ownerAssociation.includesWater}
                              onChange={(e) => setOwnerAssociation({ ...ownerAssociation, includesWater: e.target.checked })}
                              className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">فواتير الماء</span>
                          </label>
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
                  className="inline-flex items-center gap-2 px-3 py-2.5 bg-white border-2 border-red-300 text-red-600 rounded-full hover:bg-red-50 transition-all duration-300 font-semibold hover:scale-105 hover:shadow-lg"
                >
                  إلغاء
                </Link>
              </div>

              <div className="flex items-center gap-4">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="inline-flex items-center gap-2 px-3 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 transition-all duration-300 font-semibold hover:scale-105 hover:shadow-lg"
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
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={loading || uploading}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg shadow-green-500/25 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'جاري الحفظ...' : 'حفظ العمارة'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Modal: تطبيق الدور الأول على المكرر */}
      {showApplyRepeaterModal && applyRepeaterModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-scaleIn">
            <div className="bg-gradient-to-r from-emerald-500/90 to-teal-500/90 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">تطبيق الدور الأول على المكرر</h3>
                  <p className="text-emerald-100 text-sm mt-0.5">تأكيد من النظام</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                تطبيق نظام الدور الأول على أدوار المكرر (من الدور 2 إلى الدور {applyRepeaterModalInfo.lastFloorNumber - 1})؟
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  سيتم استبدال الوحدات في {applyRepeaterModalInfo.repeaterCount} {applyRepeaterModalInfo.repeaterCount === 1 ? 'دور' : 'أدوار'} فقط. الدور الأخير ({applyRepeaterModalInfo.lastFloorNumber}) لن يتأثر.
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setShowApplyRepeaterModal(false); setApplyRepeaterModalInfo(null) }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                إلغاء
              </button>
              <button
                onClick={executeApplyFirstFloorToRepeater}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-scaleIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Save className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">تأكيد حفظ العمارة</h3>
                  <p className="text-green-100 text-sm mt-0.5">مراجعة البيانات قبل الحفظ</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  ملخص البيانات
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">اسم العمارة:</span>
                    <span className="font-semibold text-gray-900">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">اسم المالك:</span>
                    <span className="font-semibold text-gray-900">{formData.ownerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">رقم القطعة:</span>
                    <span className="font-semibold text-gray-900">{formData.plotNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">عدد الأدوار:</span>
                    <span className="font-semibold text-gray-900">{floors.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">عدد الوحدات:</span>
                    <span className="font-semibold text-gray-900">{floors.reduce((sum, floor) => sum + floor.units.length, 0)}</span>
                  </div>
                  {ownerAssociation.hasAssociation && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">اتحاد الملاك:</span>
                      <span className="font-semibold text-green-600">✓ موجود</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>تأكد من صحة جميع البيانات قبل الحفظ. يمكنك التعديل لاحقاً من صفحة تفاصيل العمارة.</span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                مراجعة البيانات
              </button>
              <button
                onClick={confirmSaveBuilding}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                <CheckCircle className="w-4 h-4" />
                {loading ? 'جاري الحفظ...' : 'تأكيد الحفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


