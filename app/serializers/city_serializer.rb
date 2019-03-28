class CitySerializer < ActiveModel::Serializer
  attributes :id, :name, :trip_id
  has_many :places
  belongs_to :trip
end
